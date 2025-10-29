import {assert} from 'vitest'
import {realpath, read} from '../../lib/file-system.js'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdx from 'remark-mdx'
import {visit} from 'unist-util-visit'
import {truncate} from './parser-utils.js'

/**
 * Assert content contains or matches expected value
 * @param {RegExp|string} expectedValue - Expected value or regex
 * @param {string} [msg] - Optional error message
 */
function assertContains(expectedValue, msg) {
  if (typeof expectedValue === 'string')
    return assert.include(
      this.data.content,
      expectedValue,
      msg || `Value missing! Expected: ${expectedValue}, File: ${this.path}`
    )

  assert.match(this.data.content, expectedValue, msg || `Value missing! RegExp: ${expectedValue}, File: ${this.path}`)
}

/**
 * Assert MDX imports component with optional source/regex check
 * @param {RegExp|string|object} matcher - Component name/regex or {name, source?} object
 * @param {RegExp|string} [source] - Optional source path or regex (ignored if matcher is object)
 * @param {string} [msg] - Optional error message
 */
function assertImport(matcher, source, msg) {
  let nameMatcher = matcher
  let sourceMatcher = source

  // Handle object notation: {name, source?}
  if (typeof matcher === 'object' && !(matcher instanceof RegExp)) {
    nameMatcher = matcher.name
    sourceMatcher = matcher.source
  }

  const found = this.data.imports.some(imp => {
    const hasName = typeof nameMatcher === 'string' ? imp.includes(nameMatcher) : nameMatcher.test(imp)
    const hasSource =
      !sourceMatcher || (typeof sourceMatcher === 'string' ? imp.includes(sourceMatcher) : sourceMatcher.test(imp))
    return hasName && hasSource
  })

  const matcherText = sourceMatcher ? `${nameMatcher} from ${sourceMatcher}` : nameMatcher
  assert(found, msg || `Import missing! Expected: ${matcherText}, File: ${this.path}`)
}

/**
 * Assert MDX has JSX element with optional count/regex check
 * @param {RegExp|string} name - Element name or regex
 * @param {number} [count] - Optional expected count
 * @param {string} [msg] - Optional error message
 */
function assertElement(name, count, msg) {
  const elements = this.data.elements.filter(el => (typeof name === 'string' ? el === name : name.test(el)))
  const found = elements.length > 0

  assert(found, msg || `Element missing! Expected: ${name}, File: ${this.path}`)

  if (count !== undefined)
    assert.strictEqual(
      elements.length,
      count,
      msg || `Count mismatch! Expected: ${count}, Actual: ${elements.length}, File: ${this.path}`
    )
}

/**
 * Assert frontmatter has key with optional value/regex check
 * @param {string} key - Frontmatter key
 * @param {RegExp|string} [expectedValue] - Optional value or regex
 * @param {string} [msg] - Optional error message
 */
function assertKey(key, expectedValue, msg) {
  assert(this.data.frontmatter, `Frontmatter missing! File: ${this.path}`)
  const found = this.data.frontmatter.includes(`${key}:`)
  assert(found, msg || `Key missing! Expected: ${key}, File: ${this.path}`)

  if (!expectedValue) return

  const lines = this.data.frontmatter.split('\n')
  const keyLine = lines.find(line => line.trim().startsWith(`${key}:`))
  const value = keyLine?.split(':', 2)[1]?.trim()

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
 * Assert MDX has heading with text/regex match and optional level
 * @param {RegExp|string|object} matcher - Heading text/regex or {text?, level?} object
 * @param {number} [level] - Optional heading level (ignored if matcher is object)
 * @param {string} [msg] - Optional error message
 */
function assertHeading(matcher, level, msg) {
  let textMatcher = null
  let levelMatcher = level

  // Handle object notation: {text?, level?}
  if (typeof matcher === 'object' && !(matcher instanceof RegExp)) {
    textMatcher = matcher.text
    levelMatcher = matcher.level
  } else {
    textMatcher = matcher
  }

  const found = this.data.headings.some(h => {
    const textMatches =
      !textMatcher || (typeof textMatcher === 'string' ? h.text.includes(textMatcher) : textMatcher.test(h.text))
    const levelMatches = levelMatcher === undefined || h.level === levelMatcher
    return textMatches && levelMatches
  })

  const parts = []
  if (textMatcher) parts.push(`text: ${textMatcher}`)
  if (levelMatcher) parts.push(`level: ${levelMatcher}`)
  const matcherText = parts.length ? `${parts.join(', ')}` : 'heading'

  assert(found, msg || `Heading missing! Expected: ${matcherText}, File: ${this.path}`)
}

/**
 * Assert import count matches expected value
 * @param {number} count - Expected import count
 * @param {string} [msg] - Optional error message
 */
function assertImportCount(count, msg) {
  assert.strictEqual(
    this.data.imports.length,
    count,
    msg || `Count mismatch! Expected: ${count}, Actual: ${this.data.imports.length}, File: ${this.path}`
  )
}

/**
 * Parse MDX file and extract structure
 * @param {...string} args - Path segments to MDX file, with callback as last argument
 */
function parseMDX() {
  const args = Array.from(arguments)
  const size = args.length
  assert(typeof args[size - 1] === 'function', 'Callback function is required!')

  const callback = args.pop()
  const path = realpath(...args)
  assert(path, `File should exist: ${path}`)

  let helpers

  try {
    const content = read(path)
    const tree = unified().use(remarkParse).use(remarkFrontmatter).use(remarkMdx).parse(content)
    const data = {
      content,
      imports: [],
      elements: [],
      frontmatter: null,
      headings: [],
    }

    visit(tree, node => {
      if (node.type === 'mdxjsEsm') {
        data.imports.push(node.value)
      } else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        data.elements.push(node.name)
      } else if (node.type === 'yaml') {
        data.frontmatter = node.value
      } else if (node.type === 'heading') {
        const text = node.children.map(child => child.value || '').join('')
        data.headings.push({level: node.depth, text})
      }
    })

    const thisArg = {path, data}
    helpers = {
      ...thisArg,
      tree,
      assertContains: assertContains.bind(thisArg),
      assertElement: assertElement.bind(thisArg),
      assertHeading: assertHeading.bind(thisArg),
      assertImport: assertImport.bind(thisArg),
      assertImportCount: assertImportCount.bind(thisArg),
      assertKey: assertKey.bind(thisArg),
    }
  } catch (err) {
    assert.fail(`Invalid MDX document! File: ${path}, Error: ${err.message}`)
  }

  callback(helpers)
}

export {parseMDX}
