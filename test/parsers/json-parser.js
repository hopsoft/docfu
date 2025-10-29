import {assert} from 'vitest'
import {read} from '../../lib/file-system.js'
import {createParser, truncate} from './parser-utils.js'

/**
 * Assert JSON has key/path with optional value check using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path (e.g., 'user.name', 'items[0].id')
 * @param {*} [expectedValue] - Optional expected value (uses deepStrictEqual)
 * @param {string} [msg] - Optional error message
 */
function assertKey(keyPath, expectedValue, msg) {
  if (expectedValue !== undefined)
    assert.deepNestedPropertyVal(this.data, keyPath, expectedValue, msg || `File: ${this.path}`)
  else assert.nestedProperty(this.data, keyPath, msg || `File: ${this.path}`)
}

/**
 * Assert JSON value contains substring/element using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path
 * @param {*} expectedValue - Expected substring (string) or element (array)
 * @param {string} [msg] - Optional error message
 */
function assertContains(keyPath, expectedValue, msg) {
  assert.nestedProperty(this.data, keyPath, msg || `Key missing! Expected: ${keyPath}, File: ${this.path}`)

  // Get the value using Vitest's property access
  const keys = keyPath.split('.')
  let value = this.data
  for (const key of keys) {
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, prop, index] = arrayMatch
      value = value?.[prop]?.[parseInt(index)]
    } else {
      value = value?.[key]
    }
  }

  if (typeof value === 'string')
    return assert.include(
      value,
      expectedValue,
      msg || `Value missing! Expected: ${expectedValue}, Actual: ${truncate(value)}, File: ${this.path}`
    )

  if (Array.isArray(value))
    return assert(
      value.includes(expectedValue),
      msg || `Element missing! Expected: ${expectedValue}, File: ${this.path}`
    )

  assert.fail(msg || `Type mismatch! Expected: string or array, Actual: ${typeof value}, File: ${this.path}`)
}

/**
 * Assert JSON array length using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path to array
 * @param {number} expectedLength - Expected array length
 * @param {string} [msg] - Optional error message
 */
function assertLength(keyPath, expectedLength, msg) {
  assert.nestedProperty(this.data, keyPath, msg || `Key missing! Expected: ${keyPath}, File: ${this.path}`)

  // Get the value to check its type and length
  const keys = keyPath.split('.')
  let value = this.data
  for (const key of keys) {
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, prop, index] = arrayMatch
      value = value?.[prop]?.[parseInt(index)]
    } else {
      value = value?.[key]
    }
  }

  assert(Array.isArray(value), msg || `Type mismatch! Expected: array, Actual: ${typeof value}, File: ${this.path}`)
  assert.strictEqual(
    value.length,
    expectedLength,
    msg || `Length mismatch! Expected: ${expectedLength}, Actual: ${value.length}, File: ${this.path}`
  )
}

/**
 * Assert JSON matches structure/shape
 * @param {object} expectedShape - Expected object shape (uses deepStrictEqual)
 * @param {string} [msg] - Optional error message
 */
function assertShape(expectedShape, msg) {
  assert.deepStrictEqual(this.data, expectedShape, msg || `Shape mismatch! File: ${this.path}`)
}

/**
 * Assert array contains object with specific property values using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path to array
 * @param {object} properties - Object with property/value pairs to match
 * @param {string} [msg] - Optional error message
 */
function assertContainsWhere(keyPath, properties, msg) {
  assert.nestedProperty(this.data, keyPath, msg || `Key missing! Expected: ${keyPath}, File: ${this.path}`)

  // Get the value to check its type and search for matching object
  const keys = keyPath.split('.')
  let value = this.data
  for (const key of keys) {
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, prop, index] = arrayMatch
      value = value?.[prop]?.[parseInt(index)]
    } else {
      value = value?.[key]
    }
  }

  assert(Array.isArray(value), msg || `Type mismatch! Expected: array, Actual: ${typeof value}, File: ${this.path}`)

  const found = value.find(item => {
    if (typeof item !== 'object' || item === null) return false
    return Object.entries(properties).every(([key, val]) => item[key] === val)
  })

  assert(
    found !== undefined,
    msg || `Object not found! Expected array to contain object with: ${JSON.stringify(properties)}, File: ${this.path}`
  )
}

/**
 * Parse JSON file and provide assertion helpers
 * @param {...string} args - Path segments to JSON file, with callback as last argument
 */
const parseJSON = createParser('JSON', path => {
  const data = JSON.parse(read(path))
  const thisArg = {path, data}
  return {
    path,
    data,
    assertKey: assertKey.bind(thisArg),
    assertContains: assertContains.bind(thisArg),
    assertLength: assertLength.bind(thisArg),
    assertShape: assertShape.bind(thisArg),
    assertContainsWhere: assertContainsWhere.bind(thisArg),
  }
})

export {parseJSON}
