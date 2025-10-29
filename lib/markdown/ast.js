import {visit} from 'unist-util-visit'
import {parse, stringify} from './unified.js'

export {parse, stringify}

/**
 * Transform AST nodes in markdown content
 * Parses content, applies transformer to matching nodes, stringifies if changed
 * Preserves frontmatter by only transforming body content
 * @param {string} content - Markdown content to transform
 * @param {string|Array<string>} nodeType - Node type(s) to transform
 * @param {Function} transformer - Transformer function (node, index, parent) => void
 * @returns {string} Transformed content or original if unchanged
 */
export function transformNodes(content, nodeType, transformer) {
  // Extract frontmatter to preserve it
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
  const frontmatter = frontmatterMatch ? frontmatterMatch[0] : ''
  const body = frontmatter ? content.slice(frontmatter.length) : content

  const tree = parse(body)
  if (!tree) return content

  let changed = false
  visit(tree, nodeType, (node, index, parent) => {
    const before = JSON.stringify(node)
    const result = transformer(node, index, parent)

    // Check if node was modified in place or a new node was returned
    if (result !== undefined && result !== node) {
      parent.children[index] = result
      changed = true
    } else if (JSON.stringify(node) !== before) {
      changed = true
    }
  })

  return changed ? frontmatter + stringify(tree) : content
}
