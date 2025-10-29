import {getTitle, parseFrontmatter, mergeFrontmatter} from './markdown/frontmatter.js'
import {transformReadmeLinks, transformRelativeLinks} from './markdown/links.js'
import {detectFormat, getExtension} from './markdown/format.js'
import {toMDX} from './markdown/mdx.js'
import {toMarkdoc} from './markdown/markdoc.js'
import {isExcluded, isUnlisted} from './sandbox-config-parser.js'
import {publish as pub} from './event-bus.js'
import './logger.js'

/**
 * Transform markdown file content
 * @param {string} source - Source file path
 * @param {string} dest - Destination file path
 * @param {string} content - File content
 * @param {Object} [options={}] - Transform options
 * @returns {Promise<Object>} Transformed content and format
 */
async function transformMarkdown(source, dest, content, options = {}) {
  let transformed = transformReadmeLinks(content)
  const {format, shouldConvert} = detectFormat(dest, transformed)

  if (shouldConvert) {
    if (format === 'mdx') transformed = toMDX(dest, transformed, {components: options.components || []})
    else if (format === 'markdoc') transformed = await toMarkdoc(dest, transformed)
  } else if (dest.endsWith('.mdoc')) {
    transformed = await toMarkdoc(dest, transformed)
  } else if (dest.endsWith('.mdx')) {
    transformed = toMDX(dest, transformed, {components: options.components || []})
  }

  const withFrontmatter = mergeFrontmatter(source, transformed, options)
  return {content: withFrontmatter, format}
}

/**
 * Update partial references in mdoc files
 * @param {string} dir - Directory containing mdoc files
 * @param {Map} conversions - Map of original to final paths
 */
function updatePartials(dir, conversions) {
  const pattern = /{%\s*partial\s+file=["']([^"']+)["']/g
  const files = dir.glob('**/*.mdoc')
  let count = 0

  for (const file of files) {
    const content = dir.join(file.replace(`${dir}/`, '')).read()
    let hasChanges = false

    const updated = content.replace(pattern, (match, partialPath) => {
      const normalized = partialPath.replace(/^\.\//, '')
      if (conversions.has(normalized)) {
        const newPath = conversions.get(normalized)
        hasChanges = true
        pub('info', {partial: {from: partialPath, to: newPath}})
        return match.replace(partialPath, newPath)
      }
      return match
    })

    if (hasChanges) {
      dir.join(file.replace(`${dir}/`, '')).write(updated)
      count++
    }
  }

  if (count > 0) pub('success', {updated: `partials in ${count} file(s)`})
}

/**
 * Process markdown files in workspace
 * Adds document entries to manifest as they are processed
 * @param {Array} [components] - Custom component metadata
 * @param {Array} [configs] - Hierarchical configs for frontmatter defaults
 */
async function processMarkdown(components = [], configs = []) {
  const docs = docfu.sandbox.workspace.directory.join('src', 'content', 'docs')
  const files = docs.glob('**/*.{md,mdx,mdoc}')
  const conversions = new Map()
  const config = configs.find(c => c.dir === '.')?.config || {}
  const assetsDir = config.assets || 'assets'

  for (const src of files) {
    // Map workspace path back to source path for pattern matching
    const rel = src.replace(String(docs) + '/', '')
    const sourcePath = docfu.source.directory.join(rel)

    // Skip excluded files
    if (isExcluded(String(sourcePath), config.exclude)) {
      pub('omit', {path: src})
      continue
    }

    const srcPath = docs.join(rel)
    const content = srcPath.read()
    const basename = src.match(/([^/\\]+)\.(md|mdx|mdoc)$/i)?.[1]
    const ext = src.match(/\.(md|mdx|mdoc)$/i)?.[0]

    // Rename README to index if no index exists
    let dest = src
    if (basename?.match(/^readme$/i)) {
      const dir = srcPath.dirpath
      const hasIndex = ['md', 'mdx', 'mdoc'].some(e => dir.join(`index.${e}`).exists)
      if (!hasIndex) {
        dest = String(dir.join(`index${ext}`))
        pub('info', {rename: {from: `${basename}${ext}`, to: `index${ext}`}})
      }
    }

    const {content: transformed, format} = await transformMarkdown(src, dest, content, {
      components,
      configs,
      sourcePath,
      isUnlisted: isUnlisted(sourcePath, config.unlisted),
    })
    const finalDest = getExtension(dest, format)
    const withLinks = transformRelativeLinks(transformed, finalDest, docs, assetsDir)

    // Track conversions for partial updates
    const from = src.replace(docs + '/', '')
    const to = finalDest.replace(docs + '/', '')
    conversions.set(from, to)

    // Emit document processed event
    const frontmatter = parseFrontmatter(content)
    const title = frontmatter?.title || getTitle(src, content)
    const slug = to
      .replace(/\.(md|mdx|mdoc)$/, '')
      .replace(/\/index$/, '')
      .replace(/\s+/g, '-')
      .toLowerCase()

    pub('doc:processed', {slug, title, files: {source: sourcePath, workspace: finalDest}})

    docs.join(to).write(withLinks)

    // Remove original file if extension changed
    if (finalDest !== src) docs.join(from).remove()
  }

  updatePartials(docs, conversions)
}

export {processMarkdown}
