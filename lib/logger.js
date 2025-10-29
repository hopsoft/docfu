import {pm} from './package-manager.js'
import {subscribe as sub} from './event-bus.js'
import {theme} from './theme.js'

/**
 * Singleton logger that subscribes to EventBus and formats structured log output
 * Automatically initialized on import, subscribes to all configured events
 */
class Logger {
  /**
   * Gets the singleton Logger instance
   * @returns {Logger}
   */
  static get instance() {
    return this.#instance || new Logger()
  }

  /**
   * Private constructor enforces singleton pattern
   * Automatically subscribes to all events defined in #events
   * @returns {Logger} The frozen singleton instance
   */
  constructor() {
    if (Logger.#instance) return Logger.#instance
    Object.keys(Logger.#events).forEach(event => sub(event, detail => this.log(event, detail)))
    Logger.#instance = Object.freeze(this)
  }

  /**
   * Logs an event with metadata and detail information
   * Extracts __meta (callsite, timestamp) and formats for console output
   * @param {string} event - Event name
   * @param {Object} detail - Event detail object containing __meta and event-specific data
   * @param {Object} detail.__meta - Metadata injected by EventBus
   * @param {Callsite} detail.__meta.callsite - Call site information
   * @param {Timestamp} detail.__meta.timestamp - Timestamp information
   */
  log(event, detail) {
    const {__meta: meta, ...rest} = detail
    const {callsite, timestamp} = meta
    const level = Logger.#logLevel(event)
    const style = Logger.#logStyle(event)
    const tags = [timestamp?.iso8601, callsite?.caller, callsite?.location].reduce((acc, label) => {
      if (label?.length) acc.push(Logger.#wrap(style(label)))
      return acc
    }, [])

    console[level](...tags, `${event.toUpperCase()} ${JSON.stringify(rest)}`)
  }

  static #instance

  static #events = {
    deny: {level: 'error', style: theme.danger},
    call: {level: 'info', style: theme.vivid},
    done: {level: 'info', style: theme.success},
    exec: {level: 'info', style: theme.symbolic},
    fail: {level: 'error', style: theme.danger},
    memo: {level: 'info', style: theme.tertiary},
    miss: {level: 'warn', style: theme.warning},
    omit: {level: 'info', style: theme.tertiary},
  }

  /**
   * Gets the console log level for an event
   * @private
   * @param {string} event - Event name
   * @returns {string} Console method name (debug, info, warn, error, etc.)
   */
  static #logLevel(event) {
    return this.#events[event]?.level || 'info'
  }

  /**
   * Gets the theme style function for an event
   * @private
   * @param {string} event - Event name
   * @returns {Function} Theme styling function
   */
  static #logStyle(event) {
    return this.#events[event]?.style || theme.normal
  }

  /**
   * Wraps a value with brackets and tertiary styling
   * @private
   * @param {string} value - Value to wrap
   * @param {string} [head='['] - Opening bracket
   * @param {string} [tail=']'] - Closing bracket
   * @returns {string} Wrapped and styled value
   */
  static #wrap(value, head = '[', tail = ']') {
    return `${theme.tertiary(head)}${value}${theme.tertiary(tail)}`
  }
}

const logger = Logger.instance

export {Logger, logger}
