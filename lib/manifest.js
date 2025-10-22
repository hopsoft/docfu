import {writeFileSync} from 'fs'
import bus from './bus.js'
import './logger.js'

const FILE = import.meta.url.split('/docfu/').pop()
let data = {}

// Listen to processing events
bus.sub('doc:processed', ({slug, title, files}) => {
  data.docs.push({slug, title, files})
})

bus.sub('components:discovered', ({directory, items}) => {
  if (!items || items.length === 0) return
  data.components = {directory, items}
  bus.pub('info', {FILE, components: items})
})

bus.sub('css:discovered', ({items}) => {
  if (!items || items.length === 0) return
  data.css = {items}
  bus.pub('info', {FILE, css: items})
})

const manifest = {
  /**
   * Initialize manifest with configuration
   * @param {Object} config - DocFu configuration
   * @returns {Object} Manifest data
   */
  init(config) {
    data = {config, docs: []}
    bus.pub('done', {FILE, initialized: true})
    return data
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
    bus.pub('done', {FILE, created: {path, data}})
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
