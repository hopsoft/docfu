import {assert} from 'vitest'
import {realpath, read} from '../../lib/file-system.js'
import {Window} from 'happy-dom'
import {truncate} from './parser-utils.js'

function getElementWithLabel(elementOrSelector) {
  if (typeof elementOrSelector === 'string')
    return {element: assertSelector.call(this, elementOrSelector), label: elementOrSelector}

  assert(elementOrSelector?.tagName, `Expected element, Actual ${elementOrSelector}`)
  return {element: elementOrSelector, label: elementOrSelector.tagName}
}

/**
 * Assert element exists by selector with optional count check
 * @param {string} selector - CSS selector
 * @param {number} [count] - Optional expected count
 * @param {string} [msg] - Optional error message
 */
function assertSelector(selector, count, msg) {
  if (count === undefined) {
    const element = this.doc.querySelector(selector)
    assert(element, msg || `Element missing! Expected: ${selector}, File: ${this.path}`)
    return element
  }

  const elements = this.doc.querySelectorAll(selector)
  assert.strictEqual(
    elements.length,
    count,
    msg || `Count mismatch! Expected: ${count}, Actual: ${elements.length}, File: ${this.path}`
  )
  return elements
}

/**
 * Assert element has attribute with optional value check
 * @param {HTMLElement|string} elementOrSelector - DOM Element or selector
 * @param {string} attr - Attribute name
 * @param {RegExp|string} [expectedValue] - Optional value or regex
 * @param {string} [msg] - Optional error message
 */
function assertAttr(elementOrSelector, attr, expectedValue, msg) {
  let {element, label} = getElementWithLabel.call(this, elementOrSelector)
  assert(element?.hasAttribute(attr), msg || `Attribute missing! Expected: ${label}[${attr}], File: ${this.path}`)

  if (!expectedValue) return
  const value = element.getAttribute(attr)

  if (typeof expectedValue === 'string')
    return assert.include(
      value,
      expectedValue,
      msg || `Value mismatch! Expected: ${expectedValue}, Actual: ${truncate(value)}, File: ${this.path}`
    )

  assert.match(
    value,
    expectedValue,
    msg || `Value mismatch! RegExp: ${expectedValue}, Actual: ${truncate(value)}, File: ${this.path}`
  )
}

/**
 * Assert element contains or matches an expected value
 * @param {HTMLElement|string} elementOrSelector - DOM Element or selector
 * @param {RegExp|string} expectedValue - Expected value or regex to test
 * @param {string} [msg] - Optional error message
 */
function assertText(elementOrSelector, expectedValue, msg) {
  let {element, label} = getElementWithLabel.call(this, elementOrSelector)
  const value = element?.textContent

  if (typeof expectedValue === 'string')
    return assert.include(
      value,
      expectedValue,
      msg || `Value missing! Expected: ${expectedValue}, Actual: ${truncate(value)}, File: ${this.path}`
    )

  assert.match(
    value,
    expectedValue,
    msg || `Value missing! RegExp: ${expectedValue}, Actual: ${truncate(value)}, File: ${this.path}`
  )
}

/**
 * Parse HTML file and provide assertion helpers
 * @param {...string} args - Path segments to HTML file, with callback as last argument
 *
 * Note: parseHTML doesn't use createParser because it needs cleanup (win.close())
 */
function parseHTML() {
  const args = Array.from(arguments)
  const size = args.length
  assert(typeof args[size - 1] === 'function', 'Callback function is required!')

  const callback = args.pop()
  const path = realpath(...args)
  assert(path, `File should exist: ${path}`)

  const win = new Window()
  let helpers

  try {
    const doc = win.document
    const thisArg = {path, doc}
    doc.write(read(path))
    helpers = {
      ...thisArg,
      assertSelector: assertSelector.bind(thisArg),
      assertText: assertText.bind(thisArg),
      assertAttr: assertAttr.bind(thisArg),
    }
  } catch (err) {
    assert.fail(`Invalid HTML document! File: ${path}, Error: ${err.message}`)
  }

  try {
    callback(helpers)
  } finally {
    win.close()
  }
}

export {parseHTML}
