import {closest, dirname, exists, read, realpath} from './file-system.js'

/**
 * Find closest package.json path
 * @param {string} [dir] - Starting directory (defaults to import.meta.url)
 * @returns {string|undefined} Resolved package.json path or undefined
 */
function findPackageJSON(dir) {
  dir ||= dirname(import.meta.url)
  if (exists(dir)) {
    try {
      const path = closest('package.json', dir)
      if (path) return realpath(path)
    } catch {}
  }
}

/**
 * Load closest package.json as object
 * @param {string} [dir] - Starting directory (defaults to import.meta.url)
 * @returns {Object|undefined} Parsed package.json or undefined
 */
function loadPackageJSON(dir) {
  const path = findPackageJSON(dir)
  if (path) return JSON.parse(read(path, 'utf-8'))
}

/**
 * Draft new package.json with dependencies from closest package.json
 * @param {string} [dir] - Starting directory (defaults to import.meta.url)
 * @param {Object} [options={}] - Package options
 * @param {string} [options.name='my-package'] - Package name
 * @returns {string} JSON string of new package.json
 */
function draftPackageJSON(dir, options = {}) {
  const pkg = loadPackageJSON(dir)

  const data = {
    name: options.name || 'my-package',
    version: pkg?.version || '0.1.0',
    private: true,
    type: 'module',
    dependencies: pkg?.dependencies || {},
  }

  return JSON.stringify(data, null, 2)
}

export {findPackageJSON, loadPackageJSON, draftPackageJSON}
