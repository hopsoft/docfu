/**
 * Captures and parses stack trace information from calling code
 * Extracts caller function name and file location using regex patterns
 */
class Callsite {
  static #callerRegx = /\b([\w.]{3,})\b/
  static #pathRegx = /(?<=\/)(docfu\/\S*(?=\b))/

  #line
  #caller
  #location

  /**
   * Creates a new Callsite by parsing the Error stack trace
   * @param {number} offset - Stack frame offset (depth) to capture
   *   - Typically 4 when called from EventBus → Callsite
   *   - Adjust based on call chain depth
   */
  constructor(offset) {
    try {
      const stack = new Error().stack.split('\n')
      this.#line = String(stack[offset] || '').trim()
      this.#caller = this.#line.match(Callsite.#callerRegx)?.[0]?.trim()
      this.#location = this.#line.match(Callsite.#pathRegx)?.[0]?.trim()
    } catch {}
  }

  /**
   * Gets the caller function name
   * @returns {string} Function name or 'anonymous' if not found
   */
  get caller() {
    return this.#caller || 'anonymous'
  }

  /**
   * Gets the file location path
   * @returns {string} File path or 'unknown' if not found
   */
  get location() {
    return this.#location || 'unknown'
  }

  /**
   * Gets the raw stack trace line
   * @returns {string} Raw stack trace line or empty string
   */
  get line() {
    return this.#line || ''
  }

  /**
   * Custom inspect for Node.js util.inspect
   * @returns {string} Formatted callsite information
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Callsite { caller: "${this.caller}", location: "${this.location}" }`
  }
}

export {Callsite}
