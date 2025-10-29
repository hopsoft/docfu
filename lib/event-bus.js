import {Callsite} from './callsite.js'
import {EventEmitter} from 'events'
import {Timestamp} from './timestamp.js'

/**
 * Singleton event bus for application-wide pub/sub messaging (single process)
 */
class EventBus {
  /**
   * Gets the singleton EventBus instance
   * @returns {EventBus}
   */
  static get instance() {
    return this.#instance || new EventBus()
  }

  /**
   * Private constructor enforces singleton pattern
   * Instance is frozen on creation for immutability
   * @returns {EventBus} The frozen singleton instance
   */
  constructor() {
    return (EventBus.#instance ||= Object.freeze(this))
  }

  /**
   * Publishes an event to all subscribers
   * Automatically injects callsite and timestamp metadata for debugging/profiling
   * @param {string} event - Event name
   * @param {Object} [detail={}] - Event detail payload
   * @param {Object} [opts={}] - Internal options
   * @param {number} [opts.offset=3] - Stack frame offset for callsite detection
   * @returns {EventBus} This instance for chaining
   * @example
   * import {publish} from './event-bus.js'
   * publish('user:login', {userId: 123})
   */
  publish(event, detail, opts = {offset: 3}) {
    this.#events.add(event)
    const timestamp = new Timestamp()
    const callsite = new Callsite(opts.offset)
    this.#emitter.emit(event, {__meta: {callsite, timestamp}, ...detail})
    return this
  }

  /**
   * Subscribes to events
   * @param {string} event - Event name to listen for
   * @param {Function} subscriber - Event handler function (receives event detail)
   * @param {Object} [opts={}] - Subscription options
   * @param {boolean} [opts.once=false] - Unsubscribe after first event
   * @returns {EventBus} This instance for chaining
   * @example
   * import {subscribe} from './event-bus.js'
   * subscribe('user:login', ({userId}) => console.log(userId))
   */
  subscribe(event, subscriber, opts = {}) {
    this.#events.add(event)

    if (opts?.once) this.#emitter.once(event, subscriber)
    else this.#emitter.addListener(event, subscriber)

    return this
  }

  /**
   * Unsubscribes a specific handler from an event
   * @param {string} event - Event name
   * @param {Function} subscriber - Event handler to remove
   * @returns {EventBus} This instance for chaining
   * @example
   * import {unsubscribe} from './event-bus.js'
   * const handler = () => {}
   * subscribe('ready', handler)
   * unsubscribe('ready', handler)
   */
  unsubscribe(event, subscriber) {
    this.#emitter.removeListener(event, subscriber)
    return this
  }

  /**
   * Removes all subscribers and clears event tracking
   * @returns {EventBus} This instance for chaining
   */
  reset() {
    this.#emitter.removeAllListeners()
    this.#events.clear()
    return this
  }

  /**
   * Gets all event names with their subscribers
   * @returns {Object}
   */
  get events() {
    const result = {}
    for (const event of this.#events) result[event] = this.#emitter.listeners(event)
    return result
  }

  static #instance
  #emitter = new EventEmitter()
  #events = new Set()
}

function publish(event, detail, opts = {offset: 4}) {
  return EventBus.instance.publish(event, detail, opts)
}

function subscribe(...vargs) {
  return EventBus.instance.subscribe(...vargs)
}

function unsubscribe(...vargs) {
  return EventBus.instance.unsubscribe(...vargs)
}

export {EventBus, publish, subscribe, unsubscribe}
