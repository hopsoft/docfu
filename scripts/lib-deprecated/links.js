import {dirname, join, relative, resolve} from 'path'
import {existsSync} from 'fs'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'

/**
 * Check if a URL is relative and needs transformation
 * @param {string} url - The URL to check
 * @returns {boolean} True if relative and should be transformed
 */
function isRelativeMarkdownLink(url) {
  if (!url) return false
  // Skip absolute URLs, anchors, and protocol URLs
  if (url.startsWith('/') || url.startsWith('#') || url.includes('://')) return false
  // Only transform relative paths
  return url.startsWith('./') || url.startsWith('../')
}

/**
 * Resolve a relative link to an absolute site path
 * @param {string} linkPath - The relative link path (e.g., './terms/503B')
 * @param {string} sourceFile - Absolute path to source file containing the link
 * @param {string} workspaceDocsRoot - Absolute path to workspace docs root
 * @returns {string|null} Absolute site path or null if cannot resolve
 */
function resolveRelativeLink(linkPath, sourceFile, workspaceDocsRoot) {
  // Remove any fragment/query from link
  const [path, fragment] = linkPath.split('#')
  const [cleanPath] = path.split('?')

  // Resolve relative to source file's directory
  const sourceDir = dirname(sourceFile)
  const absolutePath = resolve(sourceDir, cleanPath)

  // Convert to path relative to workspace docs root
  let relativePath = relative(workspaceDocsRoot, absolutePath)
  if (relativePath.startsWith('..')) return null // Outside docs root

  // Remove file extension if present
  relativePath = relativePath.replace(/\.(md|mdx|mdoc)$/, '')

  // Normalize to lowercase for URL consistency (Astro/Starlight convention)
  relativePath = relativePath.toLowerCase()

  // Convert to absolute site path with leading slash
  let sitePath = '/' + relativePath.replace(/\\/g, '/')

  // Add trailing slash for directory-style URLs (Astro/Starlight default)
  if (!sitePath.endsWith('/')) sitePath += '/'

  // Normalize index paths (from README → index renaming): /guides/index/ → /guides/
  if (sitePath.endsWith('/index/')) sitePath = sitePath.slice(0, -6)

  // Re-add fragment if present
  if (fragment) sitePath += '#' + fragment

  return sitePath
}

/**
 * Extract frontmatter and body from markdown content
 * @param {string} content - Markdown content
 * @returns {{frontmatter: string, body: string, hasFrontmatter: boolean}} Separated frontmatter and body
 */
function separateFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (frontmatterMatch) {
    return {
      frontmatter: frontmatterMatch[1],
      body: frontmatterMatch[2],
      hasFrontmatter: true,
    }
  }
  return {frontmatter: '', body: content, hasFrontmatter: false}
}

/**
 * Transform relative markdown links to absolute site paths
 * Converts links like './terms/503B' to '/terms/503b/'
 * Preserves frontmatter exactly as-is
 * @param {string} content - Markdown content
 * @param {string} sourceFile - Absolute path to source file
 * @param {string} workspaceDocsRoot - Absolute path to workspace docs root
 * @returns {string} Transformed markdown content
 */
export function transformRelativeLinks(content, sourceFile, workspaceDocsRoot) {
  // Early exit if no relative links
  if (!/\[.*?\]\(\.\.?\//.test(content)) return content

  // Separate frontmatter from body to preserve frontmatter formatting
  const {frontmatter, body, hasFrontmatter} = separateFrontmatter(content)

  const tree = unified().use(remarkParse).parse(body)
  let modified = false

  visit(tree, 'link', node => {
    if (isRelativeMarkdownLink(node.url)) {
      const absolutePath = resolveRelativeLink(node.url, sourceFile, workspaceDocsRoot)
      if (absolutePath) {
        node.url = absolutePath
        modified = true
      }
    }
  })

  if (!modified) return content

  const transformedBody = unified().use(remarkStringify, {fences: true, listItemIndent: 'one'}).stringify(tree)

  // Reconstruct with original frontmatter
  if (hasFrontmatter) {
    return `---\n${frontmatter}\n---\n${transformedBody}`
  }
  return transformedBody
}
