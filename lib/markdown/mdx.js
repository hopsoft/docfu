import {extractComponents, extractImports, getDocfuComponents} from './components.js'
import {Pathname} from '../pathname.js'
import {publish as pub} from '../event-bus.js'
import '../logger.js'

/**
 * Convert to MDX with auto-imports
 * @param {string} path - File path
 * @param {string} content - Content
 * @param {Object} [options={}] - Options
 * @param {Array} [options.components=[]] - Custom components
 * @returns {string} MDX content
 */
function toMDX(path, content, options = {}) {
  const found = extractComponents(content)
  if (found.length === 0) return content

  const imported = extractImports(content)
  const needsImport = found.filter(name => !imported.has(name))
  if (needsImport.length === 0) return content

  const {components = []} = options
  const customNames = new Set(components.map(c => c.name))
  const docfuNames = getDocfuComponents()

  const custom = needsImport.filter(name => customNames.has(name))
  const docfuComps = needsImport.filter(name => docfuNames.has(name))
  const starlight = needsImport.filter(name => !customNames.has(name) && !docfuNames.has(name))

  const docsDir = docfu.sandbox.workspace.directory.join('src', 'content', 'docs')
  const componentsDir = docfu.sandbox.workspace.directory.join('src', 'components')
  const docsToComponents = docsDir.relative(componentsDir)

  let imports = ''
  for (const name of custom) {
    const comp = components.find(c => c.name === name)
    const importPath = new Pathname(docsToComponents).join(comp.path)
    imports += `import ${name} from '${importPath}'\n`
  }
  for (const name of docfuComps) {
    const importPath = new Pathname(docsToComponents).join(`${name}.astro`)
    imports += `import ${name} from '${importPath}'\n`
  }
  if (starlight.length > 0) {
    imports += `import { ${starlight.join(', ')} } from '@astrojs/starlight/components'\n`
  }

  if (imports) {
    pub('info', {imported: {count: needsImport.length, path}})
    return `${imports}\n${content}`
  }

  return content
}

export {toMDX}
