import {dirname, join, realpath} from './file-system.js'
import {getPackageManagerName} from './package-manager.js'
import {loadPackageJSON} from './package.js'
import theme from './theme.js'

let pkg

const env = {
  /**
   * Initialize DocFu environment variables
   * Sets DOCFU_BASE and DOCFU_PKGMGR
   * @param {string} importMetaUrl - import.meta.url from calling module
   */
  init(importMetaUrl) {
    const base = dirname(dirname(importMetaUrl))
    process.env.DOCFU_BASE = base
    process.env.DOCFU_PKGMGR = getPackageManagerName()
    pkg = loadPackageJSON(base)
    console.info(theme.lead('→ env'), 'DOCFU_BASE', process.env.DOCFU_BASE)
    console.info(theme.lead('→ env'), 'DOCFU_PKGMGR', process.env.DOCFU_PKGMGR)
  },

  /**
   * Get DocFu package.json
   * @returns {Object} Package.json object
   */
  get package() {
    return pkg
  },

  /**
   * Get DocFu base directory (npm package root)
   * @returns {string} Base directory path
   */
  get base() {
    return process.env.DOCFU_BASE
  },

  /**
   * Get package manager name
   * @returns {string} Package manager (bun, npm, pnpm, yarn)
   */
  get pkgmgr() {
    return process.env.DOCFU_PKGMGR
  },

  /**
   * Set source directory
   * @param {string} path - Source directory path
   * @returns {string} Resolved source path
   */
  setSource(path) {
    const source = realpath(path)
    if (!source) {
      console.error(theme.danger('✗ NOT FOUND'), theme.muted('source'), theme.muted(path))
      process.exit(1)
    }
    process.env.DOCFU_SOURCE = source
    console.info(theme.lead('→ env'), 'DOCFU_SOURCE', source)
    return source
  },

  /**
   * Get source directory
   * @returns {string|undefined} Source directory path or undefined
   */
  get source() {
    return process.env.DOCFU_SOURCE
  },

  /**
   * Set sandbox directory
   * @param {string} path - Sandbox directory path (default: .docfu)
   * @returns {string} Resolved sandbox path
   */
  setSandbox(path = '.docfu') {
    process.env.DOCFU_SANDBOX = path
    console.info(theme.lead('→ env'), 'DOCFU_SANDBOX', path)
    return path
  },

  /**
   * Get sandbox directory
   * @returns {string} Sandbox directory path
   */
  get sandbox() {
    return process.env.DOCFU_SANDBOX || '.docfu'
  },

  /**
   * Get workspace directory (sandbox/workspace)
   * @returns {string} Workspace directory path
   */
  get workspace() {
    return join(this.sandbox, 'workspace')
  },

  /**
   * Get dist directory (sandbox/dist)
   * @returns {string} Dist directory path
   */
  get dist() {
    return join(this.sandbox, 'dist')
  },
}

export default env
