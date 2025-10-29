import {patterns} from '../regex.js'

/**
 * Detect syntax type
 * @param {string} content - Content to analyze
 * @returns {string} 'mdx', 'markdoc', or 'markdown'
 */
function detectSyntax(content) {
  if (patterns.syntax.jsxComponent.test(content)) return 'mdx'
  if (patterns.syntax.markdocTag.test(content) || patterns.syntax.headingBadge.test(content)) return 'markdoc'
  return 'markdown'
}

/**
 * Detect target format
 * @param {string} filename - File path
 * @param {string} content - File content
 * @returns {Object} {format, shouldConvert}
 */
function detectFormat(filename, content) {
  if (!patterns.markdown.convertible.test(filename)) return {format: 'unchanged', shouldConvert: false}
  if (filename.includes('node_modules')) return {format: 'markdown', shouldConvert: false}

  const syntax = detectSyntax(content)
  if (syntax === 'mdx') return {format: 'mdx', shouldConvert: true}
  if (syntax === 'markdoc') return {format: 'markdoc', shouldConvert: true}
  return {format: 'markdown', shouldConvert: false}
}

/**
 * Get extension for format
 * @param {string} filename - Original filename
 * @param {string} format - Target format
 * @returns {string} Filename with extension
 */
function getExtension(filename, format) {
  if (!patterns.markdown.convertible.test(filename)) return filename
  const base = filename.replace(patterns.markdown.all, '')
  if (format === 'mdx') return `${base}.mdx`
  if (format === 'markdoc') return `${base}.mdoc`
  return `${base}.md`
}

export {detectSyntax, detectFormat, getExtension}
