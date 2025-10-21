import {visit} from 'unist-util-visit'
import {basename, exists, join, readdir, walk} from '../file-system.js'
import {parseMDX} from './unified.js'
import base from '../base.js'

/**
 * Extract JSX component names from MDX content
 * Uses AST parsing to reliably detect JSX components
 * @param {string} content - MDX content to scan
 * @returns {Array<string>} Component names
 */
function extractComponents(content) {
  const components = new Set()
  const tree = parseMDX(content)

  if (tree) {
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], node => {
      if (node.name && /^[A-Z]/.test(node.name)) {
        components.add(node.name)
      }
    })
  }

  return Array.from(components).sort()
}

/**
 * Extract existing import statements from MDX content
 * Uses AST parsing to reliably detect imports
 * @param {string} content - MDX content to scan
 * @returns {Set<string>} Imported names
 */
function extractImports(content) {
  const imported = new Set()
  const tree = parseMDX(content)

  if (tree) {
    visit(tree, 'mdxjsEsm', node => {
      for (const stmt of node.data?.estree?.body || []) {
        if (stmt.type !== 'ImportDeclaration') continue
        for (const spec of stmt.specifiers || []) {
          if (spec.type === 'ImportDefaultSpecifier' || spec.type === 'ImportSpecifier') {
            imported.add(spec.local.name)
          }
        }
      }
    })
  }

  return imported
}

/**
 * Get DocFu component names
 * @returns {Set<string>} Component names
 */
function getDocfuComponents() {
  const dir = join(base.dir, 'src', 'components')
  if (!exists(dir)) return new Set()

  const entries = readdir(dir)
  if (!entries) return new Set()

  return new Set(entries.filter(f => f.endsWith('.astro')).map(f => f.replace('.astro', '')))
}

/**
 * Discover user components from directory
 * @param {string} dir - Components directory path
 * @returns {Array<Object>} Component metadata [{name, filename, path, type}]
 */
function discoverUserComponents(dir) {
  if (!exists(dir)) return []

  const files = walk(dir, f => f.match(/\.(jsx?|tsx?|astro|vue|svelte)$/))
  const components = []

  for (const file of files) {
    const name = basename(file).replace(/\.[^.]+$/, '')
    const filename = `${name}.astro`
    const path = file
      .replace(dir, '')
      .replace(/^\//, '')
      .replace(/\.[^.]+$/, '.astro')

    components.push({name, filename, path, type: 'astro'})
  }

  return components
}

export {extractComponents, extractImports, getDocfuComponents, discoverUserComponents}
