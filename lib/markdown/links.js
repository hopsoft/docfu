import {transformNodes} from './ast.js'
import {Pathname} from '../pathname.js'
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
 * Transform relative markdown links and images to absolute site paths
 * Only transforms links/images starting with ./ or ../ to match old behavior
 * @param {string} content - Markdown content
 * @param {string} filePath - Current file path
 * @param {string} docsRoot - Documentation root directory
 * @param {string} assetsDir - Assets directory name (default: 'assets')
 * @returns {string} Transformed content
 */
function transformRelativeLinks(content, filePath, docsRoot, assetsDir = 'assets') {
  // Early exit if no relative links or images
  if (!/!\[.*?\]\(\.\.?\//.test(content) && !/\[.*?\]\(\.\.?\//.test(content)) return content

  // Transform function for both links and images
  const transform = node => {
    if (!node.url) return

    // Only transform links starting with ./ or ../
    if (!node.url.startsWith('./') && !node.url.startsWith('../')) return

    // Skip anchors
    if (node.url.startsWith('#')) return

    // Extract and preserve fragment/query
    const [path, fragment] = node.url.split('#')
    const [cleanPath] = path.split('?')

    const filePathname = new Pathname(filePath)
    const targetPath = filePathname.directory.join(cleanPath)
    const relativePath = new Pathname(docsRoot).relative(targetPath)

    // Check if this is an asset file (non-markdown)
    const isAsset = !/\.(md|mdx|mdoc)$/i.test(cleanPath)

    // Check if path is within assets directory
    const isInAssetsDir = relativePath.startsWith(assetsDir + '/')

    if (isAsset && isInAssetsDir) {
      // Transform asset links: ./assets/style.css → /assets/style.css
      let sitePath = '/' + relativePath

      // Re-add fragment if present
      if (fragment) sitePath += '#' + fragment

      node.url = sitePath
    } else {
      // Convert markdown links to absolute site path without extension, lowercase
      let sitePath = '/' + relativePath.replace(/\.(md|mdx|mdoc)$/i, '').toLowerCase()

      // Add trailing slash for directory-style URLs (Astro/Starlight default)
      if (!sitePath.endsWith('/')) sitePath += '/'

      // Normalize index paths (from README → index renaming): /guides/index/ → /guides/
      if (sitePath.endsWith('/index/')) sitePath = sitePath.slice(0, -6)

      // Re-add fragment if present
      if (fragment) sitePath += '#' + fragment

      node.url = sitePath
    }
  }

  // Transform both link and image nodes
  let result = content
  result = transformNodes(result, 'link', transform)
  result = transformNodes(result, 'image', transform)
  return result
}

export {transformReadmeLinks, transformRelativeLinks}
