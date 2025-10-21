import yaml from 'js-yaml'
import {globSync} from 'glob'
import {minimatch} from 'minimatch'
import {basename, dirname, join, read, realpath} from './file-system.js'
import base from './base.js'

const __filename = basename(import.meta.url)

/**
 * Collect and merge all docfu.yml configuration files
 * @returns {{master: Object, hierarchical: Array}} Merged master config and hierarchical configs
 */
function collectConfigs() {
  const paths = globSync('**/docfu.yml', {
    cwd: base.source,
    dot: false,
    ignore: ['node_modules/**', '.git/**', '.docfu/**'],
  })

  const configs = []
  for (const path of paths) {
    const file = join(base.source, path)
    const content = read(file)
    if (!content) continue

    const config = yaml.load(content) || {}
    const dir = dirname(file).replace(base.source, '').replace(/^\//, '') || '.'
    configs.push({dir, config, file})
  }

  // Sort by depth (root first, then subdirectories)
  configs.sort((a, b) => {
    const depthA = a.dir === '.' ? 0 : a.dir.split('/').length
    const depthB = b.dir === '.' ? 0 : b.dir.split('/').length
    return depthA - depthB
  })

  // Build master config
  const master = {
    site: {name: null, url: null, theme: 'nova'},
    sidebar: null,
    assets: null,
    components: null,
    exclude: [],
    unlisted: [],
  }

  const root = configs.find(c => c.dir === '.')
  if (root) {
    master.site.name = root.config.site?.name || master.site.name
    master.site.url = root.config.site?.url || master.site.url
    master.site.theme = root.config.site?.theme || master.site.theme
    master.sidebar = root.config.sidebar || master.sidebar
    master.assets = root.config.assets || master.assets
    master.components = root.config.components !== undefined ? root.config.components : master.components
  }

  // Collect exclude and unlisted patterns from all configs
  for (const {dir, config} of configs) {
    if (config.exclude?.length) {
      const prefixed = config.exclude.map(pattern => (dir === '.' ? pattern : join(dir, pattern).replace(/\\/g, '/')))
      master.exclude.push(...prefixed)
    }

    if (config.unlisted?.length) {
      const prefixed = config.unlisted.map(pattern => (dir === '.' ? pattern : join(dir, pattern).replace(/\\/g, '/')))
      master.unlisted.push(...prefixed)
    }
  }

  return {master, hierarchical: configs}
}

/**
 * Get frontmatter configuration for a specific file
 * @param {Array} configs - Hierarchical configs from collectConfigs()
 * @param {string} file - Absolute file path
 * @returns {{defaults: Object, specific: Object|null}} Merged frontmatter config
 */
function getFrontmatter(configs, file) {
  const realFile = realpath(file)
  const realSource = realpath(base.source)
  if (!realFile || !realSource) return {defaults: {}, specific: null}

  const rel = realFile.replace(realSource, '').replace(/^\//, '')
  const fileDir = dirname(join(base.source, rel)).replace(base.source, '').replace(/^\//, '') || '.'
  const fileName = rel.split('/').pop()

  let defaults = {}
  let specific = null

  for (const {dir, config} of configs) {
    const isAncestor = dir === '.' || fileDir === dir || fileDir.startsWith(dir + '/')

    if (isAncestor) {
      if (config.frontmatter) defaults = deepMerge(defaults, config.frontmatter)

      const configDir = dir === '.' ? '' : dir + '/'
      const relativeToConfig = rel.replace(configDir, '')

      if (config[fileName]?.frontmatter) specific = config[fileName].frontmatter
      else if (config[relativeToConfig]?.frontmatter) specific = config[relativeToConfig].frontmatter
    }
  }

  return {defaults, specific}
}

/**
 * Check if file matches patterns using glob matching
 * @param {string} file - Absolute file path
 * @param {Array<string>} patterns - Glob patterns to match
 * @returns {boolean} True if file matches any pattern
 */
function matches(file, patterns) {
  if (!patterns?.length) return false

  const realFile = realpath(file)
  const realSource = realpath(base.source)
  if (!realFile || !realSource) return false

  const rel = realFile.replace(realSource, '').replace(/^\//, '')
  const normalized = rel.replace(/\\/g, '/')

  return patterns.some(pattern => {
    let norm = pattern
    if (pattern.endsWith('/')) norm = pattern + '**'

    if (!norm.includes('/')) {
      if (minimatch(normalized, `${norm}/**`)) return true
      if (minimatch(normalized, norm, {matchBase: true})) return true
      return false
    }

    return minimatch(normalized, norm)
  })
}

/**
 * Check if file matches exclude patterns
 * @param {string} file - Absolute file path
 * @param {Array<string>} patterns - Exclude patterns
 * @returns {boolean} True if file should be excluded
 */
function isExcluded(file, patterns) {
  return matches(file, patterns)
}

/**
 * Check if file matches unlisted patterns
 * @param {string} file - Absolute file path
 * @param {Array<string>} patterns - Unlisted patterns
 * @returns {boolean} True if file should be unlisted from search
 */
function isUnlisted(file, patterns) {
  return matches(file, patterns)
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = {...target}

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]))
      result[key] = deepMerge(result[key] || {}, source[key])
    else result[key] = source[key]
  }

  return result
}

export {collectConfigs, getFrontmatter, isExcluded, isUnlisted}
