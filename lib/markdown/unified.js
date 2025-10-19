import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import remarkStringify from 'remark-stringify'

/**
 * Standard stringify options for consistent markdown output
 */
const STRINGIFY_OPTIONS = {
  bullet: '-',
  emphasis: '_',
  fences: true,
  incrementListMarker: false,
}

/**
 * Parse markdown content to AST
 * Uses plain markdown parsing (no MDX) to support all formats (MD, MDX, Markdoc)
 * Use parseMDX() when you need to parse JSX components
 * @param {string} content - Content to parse
 * @returns {Object|undefined} AST tree or undefined on error
 */
function parse(content) {
  try {
    return unified().use(remarkParse).parse(content)
  } catch {
    return undefined
  }
}

/**
 * Parse MDX content to AST with JSX support
 * Use this when you need to extract JSX components or imports
 * @param {string} content - MDX content to parse
 * @returns {Object|undefined} AST tree or undefined on error
 */
function parseMDX(content) {
  try {
    return unified().use(remarkParse).use(remarkMdx).parse(content)
  } catch {
    return undefined
  }
}

/**
 * Stringify AST tree to markdown
 * @param {Object} tree - AST tree
 * @param {Object} [options={}] - Additional stringify options
 * @returns {string} Markdown content
 */
function stringify(tree, options = {}) {
  return unified()
    .use(remarkStringify, {...STRINGIFY_OPTIONS, ...options})
    .stringify(tree)
}

export {STRINGIFY_OPTIONS, parse, parseMDX, stringify}
