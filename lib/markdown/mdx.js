import {extractComponents, extractImports, getDocfuComponents} from './components.js'
import env from '../env.js'
import theme from '../theme.js'

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
  const docfu = needsImport.filter(name => docfuNames.has(name))
  const starlight = needsImport.filter(name => !customNames.has(name) && !docfuNames.has(name))

  let imports = ''
  for (const name of custom) {
    const comp = components.find(c => c.name === name)
    imports += `import ${name} from '../../${comp.path}'\n`
  }
  for (const name of docfu) {
    imports += `import ${name} from '../../components/${name}.astro'\n`
  }
  if (starlight.length > 0) {
    imports += `import { ${starlight.join(', ')} } from '@astrojs/starlight/components'\n`
  }

  if (imports) {
    console.info(theme.lead('→ MDX'), `auto-imported ${needsImport.length} component(s)`, theme.muted(path))
    return `${imports}\n${content}`
  }

  return content
}

export {toMDX}
