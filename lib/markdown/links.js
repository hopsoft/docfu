import {transformNodes} from './ast.js'
import {join, dirname} from '../file-system.js'
import {patterns} from '../regex.js'

/**
 * Transform README links to index links
 * @param {string} content - Markdown content
 * @returns {string} Transformed content
 */
function transformReadmeLinks(content) {
  if (!/readme/i.test(content)) return content

  return transformNodes(content, 'link', node => {
    if (!node.url) return

    const match = node.url.match(patterns.links.readme)
    if (match) {
      const [, path, ext] = match
      const extension = ext || '.md'
      node.url = path ? `${path}index${extension}` : `index${extension}`
    }
  })
}

/**
 * Transform relative markdown links to absolute site paths
 * Only transforms links starting with ./ or ../ to match old behavior
 * @param {string} content - Markdown content
 * @param {string} filePath - Current file path
 * @param {string} docsRoot - Documentation root directory
 * @returns {string} Transformed content
 */
function transformRelativeLinks(content, filePath, docsRoot) {
  // Early exit if no relative links
  if (!/\[.*?\]\(\.\.?\//.test(content)) return content

  return transformNodes(content, 'link', node => {
    if (!node.url) return

    // Only transform links starting with ./ or ../
    if (!node.url.startsWith('./') && !node.url.startsWith('../')) return

    // Skip anchors
    if (node.url.startsWith('#')) return

    // Extract and preserve fragment/query
    const [path, fragment] = node.url.split('#')
    const [cleanPath] = path.split('?')

    const fileDir = dirname(filePath)
    const targetPath = join(fileDir, cleanPath)
    const relativePath = targetPath.replace(docsRoot, '').replace(/^\//, '')

    // Convert to absolute site path without extension, lowercase
    let sitePath = '/' + relativePath.replace(/\.(md|mdx|mdoc)$/i, '').toLowerCase()

    // Add trailing slash for directory-style URLs (Astro/Starlight default)
    if (!sitePath.endsWith('/')) sitePath += '/'

    // Normalize index paths (from README → index renaming): /guides/index/ → /guides/
    if (sitePath.endsWith('/index/')) sitePath = sitePath.slice(0, -6)

    // Re-add fragment if present
    if (fragment) sitePath += '#' + fragment

    node.url = sitePath
  })
}

export {transformReadmeLinks, transformRelativeLinks}
