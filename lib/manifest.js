import {Pathname} from './pathname.js'
import {publish as pub, subscribe as sub} from './event-bus.js'
import './logger.js'

let data = {}

const manifest = {
  /**
   * Initialize manifest with configuration
   * @param {Object} config - Configuration object
   * @returns {Object} Manifest data
   */
  init(config) {
    data = {config, docs: []}

    sub('doc:processed', ({slug, title, files}) => {
      data.docs.push({slug, title, files})
    })

    sub('components:discovered', ({directory, items}) => {
      if (!items || items.length === 0) return
      data.components = {directory, items}
      pub('info', {components: items})
    })

    sub('css:discovered', ({items}) => {
      if (!items || items.length === 0) return
      data.css = {items}
      pub('info', {css: items})
    })

    pub('done', {initialized: true})
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
    const pathname = new Pathname(path)
    pathname.write(JSON.stringify(data, null, 2))
    pub('done', {created: {path, data}})
    return path
  },
}

export default manifest
