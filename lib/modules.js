import {dirname, exists, join, realpath} from './file-system.js'
import {findPackageJSON} from './package.js'

/**
 * Finds the closest node_modules directory
 * @param {string} [dir=import.meta.url] - Starting directory
 * @param {string} [pkg] - Package name to match
 * @returns {string|undefined} Resolved node_modules path or undefined
 */
export function findNodeModules(dir, pkg) {
  try {
    const start = findPackageJSON(dir)
    if (!start) return

    let current = dirname(start)
    while (current && current !== dirname(current)) {
      const nm = join(current, 'node_modules')
      if (exists(nm)) {
        try {
          if (!pkg || realpath(join(nm, pkg))) return realpath(nm)
        } catch (err) {
          console.error('⚠︎ Not Found: node_modules directory', nm, err)
        }
      }
      current = dirname(current)
    }

    console.warn('✗ Not Found: node_modules directory', start, current)
  } catch (err) {
    console.error('⚠︎ Not Found: node_modules directory', dir, pkg, err)
  }
}
