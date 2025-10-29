import {Pathname} from './pathname.js'
import {publish as pub} from './event-bus.js'

/**
 * Find closest package.json path
 * @param {string} [dir] - Starting directory
 * @returns {string|undefined} Resolved package.json path or undefined
 */
function findPackageJSON(dir) {
  pub('call', {dir})

  const pathname = new Pathname(dir)
  if (pathname.exists) {
    try {
      const path = pathname.closest('package.json')
      if (path) return path
    } catch (error) {
      pub('fail', {error: error.message, dir})
      return
    }
  }

  pub('miss', {dir})
}

/**
 * Load closest package.json as object
 * @param {string} [dir] - Starting directory
 * @returns {Object|undefined} Parsed package.json or undefined
 */
function loadPackageJSON(dir) {
  pub('call', {dir})

  try {
    const path = findPackageJSON(dir)
    if (path) {
      const content = new Pathname(path).read()
      return JSON.parse(content)
    }
  } catch (error) {
    pub('fail', {error: error.message, dir})
  }
}

/**
 * Draft new package.json with dependencies from closest package.json
 * @param {string} [dir] - Starting directory (defaults to import.meta.url)
 * @param {Object} [opts={}] - Package opts
 * @param {string} [opts.name='my-package'] - Package name
 * @returns {string} JSON string of new package.json
 */
function draftPackageJSON(dir, opts = {}) {
  pub('call', {dir, opts})
  const pkg = loadPackageJSON(dir)

  const data = {
    name: opts.name || 'my-package',
    version: pkg?.version || '0.1.0',
    private: true,
    type: 'module',
    dependencies: pkg?.dependencies || {},
  }

  pub('done', {dir, opts, data})
  return JSON.stringify(data, null, 2)
}

export {findPackageJSON, loadPackageJSON, draftPackageJSON}
