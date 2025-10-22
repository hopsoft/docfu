import {basename, closest, dirname, join, normalizePath, read, realpath} from './file-system.js'
import {safeguard} from './safeguard.js'
import bus from './bus.js'
import theme from './theme.js'

const FILE = import.meta.url.split('/docfu/').pop()
const dir = dirname(dirname(import.meta.url)) // DocFu package directory
const pkg = JSON.parse(read(closest('package.json', dir))) // DocFu package.json data
let src // User markdown directory
let box // User sandbox directory

const base = {
  /**
   * DocFu package directory
   * @returns {string}
   */
  get dir() {
    return dir
  },

  /**
   * DocFu package.json data
   * @returns {Object}
   */
  get package() {
    return pkg
  },

  /**
   * DocFu example user config template path
   * @returns {string}
   */
  get configTemplatePath() {
    return realpath(this.dir, 'docfu.example.yml')
  },

  /**
   * DocFu example user config template content
   * @returns {string} Contents of docfu.example.yml
   */
  get configTemplate() {
    return read(this.configTemplatePath)
  },

  /**
   * Set user markdown directory
   * @param {string} value
   * @returns {string}
   */
  set source(value) {
    const path = realpath(value)
    if (path) {
      src = path
      this.sandbox = join(path, '.docfu')
      bus.pub('done', {FILE, source: path})
      return src
    }
    bus.pub('fail', {FILE, source: `Source directory not found! ${value}`})
    process.exit(1)
  },

  /**
   * User markdown directory
   * @returns {string|undefined}
   */
  get source() {
    return src
  },

  /**
   * Set sandbox directory
   * @param {string} value - Sandbox directory path (default: cwd/.docfu)
   * @returns {string} Resolved sandbox path
   */
  set sandbox(value) {
    try {
      let path = value

      if (typeof path !== 'string' || !path.trim().length) path = null
      else if (path.startsWith('~') || path.startsWith('/')) path = normalizePath(path)

      if (!path) {
        if (this.source) {
          path = normalizePath(this.source, '.docfu')
        } else {
          bus.pub('fail', {FILE, sandbox: `Source must be assigned before sandbox!`})
          process.exit(1)
        }
      }

      safeguard(path)
      box = path
      bus.pub('done', {FILE, sandbox: path})
      return box
    } catch (err) {
      bus.pub('fail', {FILE, sandbox: `Invalid sandbox! ${path}`})
      process.exit(1)
    }
  },

  /**
   * Get sandbox directory
   * @returns {string|undefined} Sandbox directory path
   */
  get sandbox() {
    return box
  },

  /**
   * User config path (sandbox/docfu.yml)
   * @returns {string|undefined}
   */
  get configPath() {
    if (this.sandbox) return join(this.sandbox, 'docfu.yml')
  },

  /**
   * User config template content
   * @returns {string} Contents of docfu.example.yml
   */
  get config() {
    return read(this.configPath)
  },

  /**
   * Get workspace directory (sandbox/workspace)
   * @returns {string|undefined} Workspace directory path
   */
  get workspace() {
    if (this.sandbox) return join(this.sandbox, 'workspace')
  },

  /**
   * Get dist directory (sandbox/dist)
   * @returns {string|undefined}
   */
  get dist() {
    if (this.sandbox) return join(this.sandbox, 'dist')
  },

  relativePath() {
    return
  },
}

export default base
