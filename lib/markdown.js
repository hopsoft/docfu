import {dirname, join, read, realpath, rm, walk, write} from './file-system.js'
import {getTitle, parseFrontmatter, mergeFrontmatter} from './markdown/frontmatter.js'
import {transformReadmeLinks, transformRelativeLinks} from './markdown/links.js'
import {detectFormat, getExtension} from './markdown/format.js'
import {toMDX} from './markdown/mdx.js'
import {toMarkdoc} from './markdown/markdoc.js'
import manifest from './manifest.js'
import theme from './theme.js'

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
  const files = walk(dir, f => f.endsWith('.mdoc'))
  let count = 0

  for (const file of files) {
    const content = read(file)
    let hasChanges = false

    const updated = content.replace(pattern, (match, partialPath) => {
      const normalized = partialPath.replace(/^\.\//, '')
      if (conversions.has(normalized)) {
        const newPath = conversions.get(normalized)
        hasChanges = true
        console.info(theme.lead('→ partial'), `${partialPath} → ${newPath}`, theme.muted(file))
        return match.replace(partialPath, newPath)
      }
      return match
    })

    if (hasChanges) {
      write(file, updated)
      count++
    }
  }

  if (count > 0) console.info(theme.success(`✓ Updated partials in ${count} file(s)`))
}

/**
 * Process markdown files in workspace
 * Adds document entries to manifest as they are processed
 * @param {string} workspace - Workspace directory path
 * @param {Object} [options={}] - Processing options
 * @param {string} [options.source] - Source directory path
 * @param {Array} [options.components] - Custom component metadata
 * @param {Function} [options.isExcluded] - Check if file is excluded
 * @param {Function} [options.isUnlisted] - Check if file is unlisted
 */
async function processMarkdown(workspace, options = {}) {
  const docs = realpath(join(workspace, 'src', 'content', 'docs'))
  const files = walk(docs, f => f.match(/\.(md|mdx|mdoc)$/i))
  const conversions = new Map()

  for (const src of files) {
    // Map workspace path back to source path for pattern matching
    const rel = src.replace(docs + '/', '')
    const sourcePath = options.source ? join(options.source, rel) : src

    // Skip excluded files
    if (options.isExcluded && options.isExcluded(sourcePath)) {
      console.info(theme.warning('✗ excluded'), src)
      continue
    }

    const content = read(src)
    const basename = src.match(/([^/\\]+)\.(md|mdx|mdoc)$/i)?.[1]
    const ext = src.match(/\.(md|mdx|mdoc)$/i)?.[0]

    // Rename README to index if no index exists
    let dest = src
    if (basename?.match(/^readme$/i)) {
      const dir = dirname(src)
      const hasIndex = ['md', 'mdx', 'mdoc'].some(e => realpath(join(dir, `index.${e}`)))
      if (!hasIndex) {
        dest = join(dir, `index${ext}`)
        console.info(theme.lead('→ rename'), `${basename}${ext} → index${ext}`)
      }
    }

    const {content: transformed, format} = await transformMarkdown(src, dest, content, {
      ...options,
      sourcePath,
      isUnlisted: options.isUnlisted && options.isUnlisted(sourcePath),
    })
    const finalDest = getExtension(dest, format)
    const withLinks = transformRelativeLinks(transformed, finalDest, docs)

    // Track conversions for partial updates
    const from = src.replace(docs + '/', '')
    const to = finalDest.replace(docs + '/', '')
    conversions.set(from, to)

    // Add to manifest
    const frontmatter = parseFrontmatter(content)
    const title = frontmatter?.title || getTitle(src, content)
    const slug = to
      .replace(/\.(md|mdx|mdoc)$/, '')
      .replace(/\/index$/, '')
      .toLowerCase()

    manifest.addDoc({slug, title, files: {source: sourcePath, workspace: finalDest}})

    write(finalDest, withLinks)

    // Remove original file if extension changed
    if (finalDest !== src) rm(src)
  }

  updatePartials(docs, conversions)
}

export {processMarkdown}
