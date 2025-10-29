import yaml from 'js-yaml'
import {Pathname} from '../pathname.js'
import {getFrontmatter} from '../sandbox-config-parser.js'
import {publish as pub} from '../event-bus.js'

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

  const pathname = new Pathname(path)
  const name = pathname.basename('.md') || pathname.basename('.mdx') || pathname.basename('.mdoc')
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
 * @param {Object} [opts={}] - Options
 * @param {string} [opts.sourcePath] - Original source file path (before workspace mapping)
 * @param {Array} [opts.configs] - Hierarchical configs from collectConfigs()
 * @param {boolean} [opts.isUnlisted] - Mark as unlisted
 * @returns {string} Content with merged frontmatter
 */
function mergeFrontmatter(path, content, opts = {}) {
  pub('call', {path, content, opts})
  path = opts.sourcePath || path
  const {frontmatter, body} = extractFrontmatter(content)

  // Apply hierarchical config if available
  if (opts.configs) {
    const {defaults, specific} = getFrontmatter(opts.configs, path)
    Object.assign(frontmatter, defaults, specific)
  }

  // Mark as unlisted if needed
  if (opts.isUnlisted) {
    frontmatter.pagefind = false
    pub('omit', {path})
  }

  // Ensure title exists
  if (!frontmatter.title) {
    frontmatter.title = getTitle(path, body)
    pub('memo', {title: frontmatter.title})
  }

  const serialized = serializeFrontmatter(frontmatter, body, {removeH1: true})
  pub('done', {serialized})
  return serialized
}

export {parseFrontmatter, getTitle, mergeFrontmatter}
