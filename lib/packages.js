import {basename, closest, exists, read, realpath} from './file-system.js'
import bus from './bus.js'

const FILE = import.meta.url.split('/docfu/').pop()

/**
 * Find closest package.json path
 * @param {string} [dir] - Starting directory
 * @returns {string|undefined} Resolved package.json path or undefined
 */
function findPackageJSON(dir) {
  bus.pub('call', {FILE, findPackageJSON: {dir}})

  if (exists(dir)) {
    try {
      const path = closest('package.json', dir)
      if (path) return realpath(path)
    } catch (error) {
      bus.pub('fail', {FILE, findPackageJSON: {dir, error}})
      return
    }
  }

  bus.pub('miss', {FILE, findPackageJSON: {dir}})
}

/**
 * Load closest package.json as object
 * @param {string} [dir] - Starting directory
 * @returns {Object|undefined} Parsed package.json or undefined
 */
function loadPackageJSON(dir) {
  bus.pub('call', {FILE, loadPackageJSON: {dir}})

  try {
    const path = findPackageJSON(dir)
    if (path) return JSON.parse(read(path))
  } catch (error) {
    bus.pub('fail', {FILE, loadPackageJSON: {dir, error}})
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
  bus.pub('call', {FILE, draftPackageJSON: {dir, opts}})
  const pkg = loadPackageJSON(dir)

  const data = {
    name: opts.name || 'my-package',
    version: pkg?.version || '0.1.0',
    private: true,
    type: 'module',
    dependencies: pkg?.dependencies || {},
  }

  bus.pub('done', {FILE, draftPackageJSON: {dir, opts, data}})
  return JSON.stringify(data, null, 2)
}

export {findPackageJSON, loadPackageJSON, draftPackageJSON}
