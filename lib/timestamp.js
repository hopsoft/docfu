/**
 * High-precision timestamp with nanosecond accuracy
 * Uses process.hrtime.bigint() for monotonic timing
 */
class Timestamp {
  /**
   * Creates a new timestamp capturing current time with nanosecond precision
   */
  constructor() {
    this.#ns = process.hrtime.bigint()
    this.#us = Number(this.#ns / 1000n)
    this.#usISO = String((this.#ns % 1_000_000n) / 1000n).padStart(6, '0')

    const now = new Date() // year/month/day/hour/min/sec
    this.#iso = now.toISOString().slice(0, -5)
  }

  /**
   * Gets timestamp in nanoseconds since monotonic epoch
   * @returns {BigInt} Nanoseconds
   */
  get ns() {
    return this.#ns
  }

  /**
   * Gets timestamp in microseconds since epoch
   * @returns {number} Microseconds
   */
  get us() {
    return this.#us
  }

  /**
   * Gets elapsed time in nanoseconds since first Timestamp was created
   * @returns {BigInt} Elapsed nanoseconds
   */
  get elapsed() {
    return this.#ns - Timestamp.#start
  }

  /**
   * Gets ISO 8601 formatted timestamp with microsecond precision
   * @returns {string} ISO 8601 string (e.g., "2024-01-15T14:30:25.123456Z")
   */
  get iso8601() {
    return `${this.#iso}.${this.#usISO}Z`
  }

  static #start = process.hrtime.bigint() // 1st nanosecond reading for elapsed calculations
  #ns // ......Nanoseconds since fixed, monotonic epoch (BigInt)
  #us // ......Microseconds since epoch (Integer)
  #usISO // ...Microseconds zero-padded fractional for ISO (String: "123456")
  #iso // .....ISO base without fractional seconds (String: "YYYY-MM-DDTHH:mm:ss")
}

export {Timestamp}
