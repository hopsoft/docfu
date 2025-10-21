import {basename, dirname, join, read, realpath} from './file-system.js'
import {findPackageJSON, loadPackageJSON} from './packages.js'
import {safeguard} from './safeguard.js'
import bus from './bus.js'
import theme from './theme.js'

const __file = basename(import.meta.url)
let dir // DocFu package directory
let pkg // DocFu package.json data
let src // User markdown directory
let box // User sandbox directory

const base = {
  /**
   * DocFu's package directory
   * @returns {string}
   */
  get dir() {
    return (dir ||= dirname(findPackageJSON(import.meta.url)))
  },

  /**
   * DocFu's package.json data
   * @returns {Object}
   */
  get package() {
    return (pkg ||= loadPackageJSON(this.dir))
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
   * @param {string} path
   * @returns {string}
   */
  set source(path) {
    const real = realpath(path)
    if (real) {
      bus.pub('done', {file: __file, source: real})
      return (src = real)
    }
    bus.pub('fail', {message: `Source directory not found! ${path}`})
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
   * @param {string} path - Sandbox directory path (default: cwd/.docfu)
   * @returns {string} Resolved sandbox path
   */
  set sandbox(path) {
    try {
      if (typeof path !== 'string' || (path = path.trim()).length === 0) path = '.docfu'
      if (path.startsWith('~')) path = realpath(path) || path
      if (!path.startsWith('/')) path = join(process.cwd(), path)
      if (path) {
        safeguard(path)
        bus.pub('done', {file: __file, sandbox: path})
        return (box = path)
      }
    } catch (err) {
      bus.pub('fail', {message: `Invalid sandbox directory! ${path}`})
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
}

export default base
