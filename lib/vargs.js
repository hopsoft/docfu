/**
 * Ruby-inspired variadic argument parser for flexible method signatures
 * Enables optional positional, keyword, and callback arguments in any combination
 *
 * Mimics Ruby's method signature pattern: def method(pos, key: val, &block)
 *
 * IMPORTANT: args, kwargs, and callback ALWAYS exist (never undefined)
 * ✓ Ensures safe destructuring without null/undefined guard checks
 *   - Missing args default to frozen empty array []
 *   - Missing kwargs default to frozen empty object {}
 *   - Missing callback defaults to frozen no-op function () => {}
 *
 * ✓ All combos work
 *   - positional only......... Vargs.parse('a', 'b')
 *   - kwargs only............. Vargs.parse({foo: 1})
 *   - callback only........... Vargs.parse(fn)
 *   - positional + callback... Vargs.parse('a', fn)
 *   - kwargs + callback....... Vargs.parse({foo: 1}, fn)
 *   - positional + kwargs..... Vargs.parse('a', 'b', {foo: 1})
 *   - all..................... Vargs.parse('a', 'b', {foo: 1}, fn)
 *
 * ✓ Pre-defined convenience aliases
 *   - callback: cb, fn
 *   - kwargs: config, options, opts
 *
 * Terminology:
 * - vargs: Variadic/variable arguments (raw input before parsing)
 * - args: Positional arguments (parsed output)
 *
 * @example
 * // Using rest parameters (works with arrow functions)
 * function myMethod(...vargs) {
 *   const {args, kwargs, callback} = Vargs.parse(...vargs)
 * }
 *
 * // Using arguments object (function expressions/declarations only)
 * function myMethod() {
 *   const {args, kwargs, callback} = Vargs.parse(...arguments)
 * }
 *
 * // Arrow functions don't have `arguments` - use rest parameters
 * const myMethod = (...vargs) => {
 *   const {args, kwargs, callback} = Vargs.parse(...vargs)
 * }
 *
 * // Destructure only what you need
 * function run(...vargs) {
 *   const {args} = Vargs.parse(...vargs)           // Just positional
 *   const {kwargs} = Vargs.parse(...vargs)         // Just kwargs
 *   const {args, callback} = Vargs.parse(...vargs) // Positional + callback
 * }
 *
 * // Destructure with pre-defined aliases
 * function exec(...vargs) {
 *   const {args, opts, cb} = Vargs.parse(...vargs)
 *
 *   // Access positional args
 *   const [first, second, ...tail] = args         // Destructure by index
 *   const third = args.shift()                    // Or shift (mutates args)
 *
 *   // Access kwargs
 *   const {foo, bar} = opts                       // Destructure
 *   const baz = opts.baz                          // Or property access
 *
 *   // Safe to call - no guards needed
 *   cb(first, foo)                                // No-op if not provided
 * }
 */
class Vargs {
  /**
   * Factory method to create Vargs instance (alias for parse)
   * @param {...*} vargs - Variadic arguments to parse (any combination of positional, kwargs, callback)
   * @returns {Vargs} New Vargs instance
   */
  static from(...vargs) {
    return new Vargs(...vargs)
  }

  /**
   * Parse variadic arguments (recommended)
   * @param {...*} vargs - Variadic arguments to parse (any combination of positional, kwargs, callback)
   * @returns {Vargs} New Vargs instance
   */
  static parse(...vargs) {
    return new Vargs(...vargs)
  }

  /**
   * Parses variadic arguments using right-to-left strategy
   *
   * Order matters:
   * 1. First checks for callback (Function)
   * 2. Then checks for kwargs (Object)
   * 3. Finally considers remaining arguments as positional
   *
   * Type detection uses exact constructor matching:
   * - callback: constructor === Function (arrow functions, function expressions, named functions)
   * - kwargs: constructor === Object (standard plain objects only)
   * - Everything else: positional args
   *
   * @param {...*} vargs - Variadic arguments to parse (any combination of positional, kwargs, callback)
   */
  constructor(...vargs) {
    this.#vargs = Object.freeze([...vargs])

    let kwargs, callback
    const last = vargs[vargs.length - 1]
    if (last?.constructor === Function && !String(last).startsWith('class')) callback = vargs.pop()
    if (vargs[vargs.length - 1]?.constructor === Object) kwargs = vargs.pop()

    this.#args = vargs
    this.#kwargs = kwargs || Vargs.#defaultKwargs
    this.#callback = callback || Vargs.#defaultCallback
  }

  /**
   * Gets frozen snapshot of original unparsed arguments
   * @returns {Array} Frozen array of original arguments
   */
  get unparsed() {
    return this.#vargs
  }

  /**
   * Gets positional arguments
   * @returns {Array} Positional arguments (mutable)
   */
  get args() {
    return this.#args
  }

  /**
   * Gets callback function
   * @returns {Function} Callback function or no-op default
   */
  get callback() {
    return this.#callback
  }

  /**
   * Alias for callback
   * @returns {Function} Callback function or no-op default
   */
  get cb() {
    return this.#callback
  }

  /**
   * Alias for kwargs
   * @returns {Object} Keyword arguments object (mutable)
   */
  get config() {
    return this.#kwargs
  }

  /**
   * Alias for callback
   * @returns {Function} Callback function or no-op default
   */
  get fn() {
    return this.#callback
  }

  /**
   * Gets keyword arguments
   * @returns {Object} Keyword arguments object (mutable)
   */
  get kwargs() {
    return this.#kwargs
  }

  /**
   * Alias for kwargs
   * @returns {Object} Keyword arguments object (mutable)
   */
  get options() {
    return this.#kwargs
  }

  /**
   * Alias for kwargs
   * @returns {Object} Keyword arguments object (mutable)
   */
  get opts() {
    return this.#kwargs
  }

  static #defaultArgs = Object.freeze([])
  static #defaultCallback = Object.freeze(() => {})
  static #defaultKwargs = Object.freeze({})

  #args
  #callback
  #kwargs
  #vargs
}

const xv = Vargs.parse

export {Vargs, xv}
