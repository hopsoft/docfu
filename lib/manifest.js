import {writeFileSync} from 'fs'
import theme from './theme.js'

let data = {}

const manifest = {
  /**
   * Initialize manifest with configuration
   * @param {Object} config - DocFu configuration
   * @returns {Object} Manifest data
   */
  init(config) {
    data = {config, docs: []}
    console.info(theme.lead('→ manifest'), 'initialized')
    return data
  },

  /**
   * Add document entry to manifest
   * @param {Object} entry - Document entry
   * @param {string} entry.slug - Document slug
   * @param {string} entry.title - Document title
   * @param {Object} entry.files - File paths
   * @param {string} entry.files.source - Source file path
   * @param {string} entry.files.workspace - Workspace file path
   * @returns {Object} Document entry
   */
  addDoc(entry) {
    data.docs.push(entry)
    return entry
  },

  /**
   * Set components metadata
   * @param {string} directory - Components directory name
   * @param {Array} items - Component items
   * @returns {Object} Components metadata
   */
  setComponents(directory, items) {
    if (!items || items.length === 0) return
    data.components = {directory, items}
    console.info(theme.lead('→ manifest'), `${items.length} component(s)`)
    return data.components
  },

  /**
   * Set CSS metadata
   * @param {Array} items - CSS items
   * @returns {Object} CSS metadata
   */
  setCss(items) {
    if (!items || items.length === 0) return
    data.css = {items}
    console.info(theme.lead('→ manifest'), `${items.length} CSS file(s)`)
    return data.css
  },

  /**
   * Get manifest data
   * @returns {Object} Manifest data
   */
  get data() {
    return data
  },

  /**
   * Write manifest to file
   * @param {string} path - File path
   * @returns {string} Written file path
   */
  write(path) {
    writeFileSync(path, JSON.stringify(data, null, 2))
    console.info(theme.success('✓ manifest.json'))
    return path
  },

  /**
   * Reset manifest (for testing)
   * @returns {Object} Empty manifest data
   */
  reset() {
    data = {}
    return data
  },
}

export default manifest
