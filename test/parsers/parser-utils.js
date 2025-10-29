import {assert} from 'vitest'
import {realpath, read} from '../../lib/file-system.js'

/**
 * Truncate long values for error messages
 * @param {string} value - Value to truncate
 * @param {number} [max=32] - Max length before truncation
 */
function truncate(value, max = 32) {
  if (!value || value.length <= max) return value
  return `${value.slice(0, max)}...`
}

/**
 * Test value against a matcher (string or regex)
 * @param {string} value - Value to test
 * @param {RegExp|string} matcher - String (substring match) or regex
 * @returns {boolean} Whether value matches
 */
function matchValue(value, matcher) {
  if (typeof matcher === 'string') return value?.includes(matcher)
  return matcher.test(value)
}

/**
 * Assert value matches expected pattern using Vitest's built-in assertions
 * @param {string} value - Actual value to test
 * @param {RegExp|string} matcher - Expected pattern
 * @param {string} path - File path for error messages
 * @param {string} [msg] - Optional error message
 */
function assertValueMatch(value, matcher, path, msg) {
  if (typeof matcher === 'string')
    return assert.include(
      value,
      matcher,
      msg || `Value missing! Expected: ${matcher}, Actual: ${truncate(value)}, File: ${path}`
    )

  assert.match(value, matcher, msg || `Value missing! RegExp: ${matcher}, Actual: ${truncate(value)}, File: ${path}`)
}

/**
 * Generic parser wrapper - handles common setup/teardown
 * @param {string} docType - Document type for error messages (e.g., 'HTML', 'JSON')
 * @param {Function} parseFn - Parser function (path) => helpers
 * @returns {Function} Parser function that handles args/callback
 */
function createParser(docType, parseFn) {
  return function parser() {
    const args = Array.from(arguments)
    const size = args.length
    assert(typeof args[size - 1] === 'function', 'Callback function is required!')

    const callback = args.pop()
    const path = realpath(...args)
    assert(path, `File does not exist! File: ${path}`)

    let helpers
    try {
      helpers = parseFn(path)
    } catch (err) {
      assert.fail(`Invalid ${docType} document! File: ${path}, Error: ${err.message}`)
    }

    return callback(helpers)
  }
}

/**
 * Parse frontmatter key with optional value check
 * @param {string} frontmatter - Frontmatter content
 * @param {string} key - Key to find
 * @param {RegExp|string} [matcher] - Optional value to verify
 * @param {string} path - File path for error messages
 * @param {string} [msg] - Optional error message
 */
function parseFrontmatterKey(frontmatter, key, matcher, path, msg) {
  assert(frontmatter, msg || `Frontmatter missing! File: ${path}`)
  assert(frontmatter.includes(`${key}:`), msg || `Key missing! Expected: ${key}, File: ${path}`)

  if (!matcher) return

  const lines = frontmatter.split('\n')
  const keyLine = lines.find(line => line.trim().startsWith(`${key}:`))
  const value = keyLine?.split(':', 2)[1]?.trim()

  return assertValueMatch(value, matcher, path, msg)
}

/**
 * Match heading with flexible criteria
 * @param {Array} headings - Array of heading objects {text, level, id?}
 * @param {RegExp|string|object} matcher - Matcher criteria
 * @param {number} [level] - Optional level override
 * @returns {boolean} Whether a matching heading was found
 */
function matchHeading(headings, matcher, level) {
  const isObject = typeof matcher === 'object' && !(matcher instanceof RegExp)
  const textMatcher = isObject ? matcher.text : matcher
  const levelMatcher = isObject ? matcher.level : level
  const idMatcher = isObject ? matcher.id : null

  return headings.some(h => {
    const textMatches = !textMatcher || matchValue(h.text, textMatcher)
    const levelMatches = levelMatcher === undefined || h.level === levelMatcher
    const idMatches = !idMatcher || matchValue(h.id, idMatcher)
    return textMatches && levelMatches && idMatches
  })
}

/**
 * Format heading matcher for error messages
 * @param {*} matcher - Heading matcher
 * @param {number} [level] - Optional level
 * @returns {string} Formatted matcher description
 */
function formatHeadingMatcher(matcher, level) {
  const parts = []

  if (typeof matcher === 'object' && !(matcher instanceof RegExp)) {
    if (matcher.text) parts.push(`text: ${matcher.text}`)
    if (matcher.level) parts.push(`level: ${matcher.level}`)
    if (matcher.id) parts.push(`id: ${matcher.id}`)
  } else {
    if (matcher) parts.push(`text: ${matcher}`)
    if (level) parts.push(`level: ${level}`)
  }

  return parts.length ? parts.join(', ') : 'heading'
}

export {truncate, matchValue, assertValueMatch, createParser, parseFrontmatterKey, matchHeading, formatHeadingMatcher}
