import yaml from 'js-yaml'
import {basename} from '../file-system.js'
import {getFrontmatter} from '../config.js'
import bus from '../bus.js'
import '../logger.js'

const __file = basename(import.meta.url)

/**
 * Parse frontmatter from markdown content
 * @param {string} content - Markdown content
 * @returns {Object|null} Parsed frontmatter or null
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  try {
    return yaml.load(match[1])
  } catch {
    return null
  }
}

/**
 * Get title from file path or content
 * @param {string} path - File path
 * @param {string} content - File content
 * @returns {string} Title
 */
function getTitle(path, content) {
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1]

  const name = basename(path, '.md') || basename(path, '.mdx') || basename(path, '.mdoc')
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Extract frontmatter and body from content
 * @param {string} content - Markdown content
 * @returns {{frontmatter: Object, body: string}} Frontmatter and body
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
  if (!match) return {frontmatter: {}, body: content}

  try {
    return {
      frontmatter: yaml.load(match[1]) || {},
      body: match[2],
    }
  } catch {
    return {frontmatter: {}, body: content}
  }
}

/**
 * Serialize frontmatter and content
 * @param {Object} frontmatter - Frontmatter object
 * @param {string} content - Content body
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.removeH1] - Remove first H1 from content
 * @returns {string} Serialized content
 */
function serializeFrontmatter(frontmatter, content, options = {}) {
  if (Object.keys(frontmatter).length === 0) return content

  if (options.removeH1) content = content.replace(/^#\s+.+$/m, '').trimStart()

  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  })

  return `---\n${yamlStr}---\n${content}`
}

/**
 * Merge frontmatter with hierarchical config
 * @param {string} path - File path
 * @param {string} content - Markdown content
 * @param {Object} [options={}] - Options
 * @param {string} [options.sourcePath] - Original source file path (before workspace mapping)
 * @param {Array} [options.configs] - Hierarchical configs from collectConfigs()
 * @param {boolean} [options.isUnlisted] - Mark as unlisted
 * @returns {string} Content with merged frontmatter
 */
function mergeFrontmatter(path, content, options = {}) {
  path = options.sourcePath || path
  const {frontmatter, body} = extractFrontmatter(content)

  // Apply hierarchical config if available
  if (options.configs) {
    const {defaults, specific} = getFrontmatter(options.configs, path)
    Object.assign(frontmatter, defaults, specific)
  }

  // Mark as unlisted if needed
  if (options.isUnlisted) {
    frontmatter.pagefind = false
    bus.pub('omit', {file: __file, 'FILE EXCLUDED': path})
  }

  // Ensure title exists
  if (!frontmatter.title) {
    frontmatter.title = getTitle(path, body)
    bus.pub('done', {file: __file, 'TITLE ADDED': {value: frontmatter.title, path}})
  }

  return serializeFrontmatter(frontmatter, body, {removeH1: true})
}

export {parseFrontmatter, getTitle, mergeFrontmatter}
