import {assert} from 'vitest'
import {realpath, read} from '../../lib/file-system.js'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
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
 * Assert markdown has heading with text/regex/id match and optional level
 * @param {RegExp|string|object} matcher - Heading text/regex or {text?, level?, id?} object
 * @param {number} [level] - Optional heading level (ignored if matcher is object)
 * @param {string} [msg] - Optional error message
 */
function assertHeading(matcher, level, msg) {
  let textMatcher = null
  let levelMatcher = level
  let idMatcher = null

  // Handle object notation: {text?, level?, id?}
  if (typeof matcher === 'object' && !(matcher instanceof RegExp)) {
    textMatcher = matcher.text
    levelMatcher = matcher.level
    idMatcher = matcher.id
  } else {
    textMatcher = matcher
  }

  const found = this.data.headings.some(h => {
    const textMatches =
      !textMatcher || (typeof textMatcher === 'string' ? h.text.includes(textMatcher) : textMatcher.test(h.text))
    const levelMatches = levelMatcher === undefined || h.level === levelMatcher
    const idMatches = !idMatcher || (typeof idMatcher === 'string' ? h.id === idMatcher : idMatcher?.test(h.id))
    return textMatches && levelMatches && idMatches
  })

  const parts = []
  if (textMatcher) parts.push(`text: ${textMatcher}`)
  if (levelMatcher) parts.push(`level: ${levelMatcher}`)
  if (idMatcher) parts.push(`id: ${idMatcher}`)
  const matcherText = parts.length ? `${parts.join(', ')}` : 'heading'

  assert(found, msg || `Heading missing! Expected: ${matcherText}, File: ${this.path}`)
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
 * Assert markdown has Markdoc tag with optional attribute check
 * @param {RegExp|string|object} matcher - Tag name/regex or {name, attr?, value?} object
 * @param {string} [msg] - Optional error message
 */
function assertTag(matcher, msg) {
  if (typeof matcher === 'string' || matcher instanceof RegExp) {
    const found = this.data.tags.some(tag => (typeof matcher === 'string' ? tag === matcher : matcher.test(tag)))
    assert(found, msg || `Tag missing! Expected: ${matcher}, File: ${this.path}`)
    return
  }

  // Handle object notation: {name, attr?, value?}
  const {name, attr, value} = matcher
  const found = this.data.tags.includes(name)
  assert(found, msg || `Tag missing! Expected: ${name}, File: ${this.path}`)

  if (attr || value) {
    const tagRegex = new RegExp(`\\{%\\s*${name}\\s+[^%]*${attr || ''}[^%]*%\\}`)
    const tagFound = tagRegex.test(this.data.content)
    const matcherText = `${name} with ${attr}${value ? `="${value}"` : ''}`
    assert(tagFound, msg || `Tag missing! Expected: ${matcherText}, File: ${this.path}`)
  }
}

/**
 * Assert heading count matches expected value
 * @param {number} count - Expected heading count
 * @param {number} [level] - Optional level filter
 * @param {string} [msg] - Optional error message
 */
function assertHeadingCount(count, level, msg) {
  const headings = level ? this.data.headings.filter(h => h.level === level) : this.data.headings
  const levelText = level ? ` level ${level}` : ''
  assert.strictEqual(
    headings.length,
    count,
    msg || `Count mismatch! Expected: ${count}${levelText}, Actual: ${headings.length}, File: ${this.path}`
  )
}

/**
 * Parse Markdown/Markdoc file and extract structure
 * @param {...string} args - Path segments to file, with callback as last argument
 */
function parseMarkdown() {
  const args = Array.from(arguments)
  const size = args.length
  assert(typeof args[size - 1] === 'function', 'Callback function is required!')

  const callback = args.pop()
  const path = realpath(...args)
  assert(path, `File should exist: ${path}`)

  let helpers

  try {
    const content = read(path)
    const tree = unified().use(remarkParse).use(remarkFrontmatter).parse(content)

    const data = {
      content,
      frontmatter: null,
      headings: [],
      tags: [],
    }

    visit(tree, node => {
      if (node.type === 'yaml') {
        data.frontmatter = node.value
      } else if (node.type === 'heading') {
        const text = node.children.map(child => child.value || '').join('')

        // Check for Markdoc heading attributes like {% #id %}
        let id = null
        const idMatch = text.match(/\{%\s*#(\w+)\s*%\}/)
        if (idMatch) id = idMatch[1]

        data.headings.push({level: node.depth, text, id})
      } else if (node.type === 'text' && node.value) {
        // Extract Markdoc tags ({% partial %}, etc.)
        const tagMatches = node.value.matchAll(/\{%\s*(\w+)\s+/g)
        for (const match of tagMatches) {
          if (!data.tags.includes(match[1])) data.tags.push(match[1])
        }
      }
    })

    const thisArg = {path, data}
    helpers = {
      ...thisArg,
      tree,
      assertContains: assertContains.bind(thisArg),
      assertHeading: assertHeading.bind(thisArg),
      assertHeadingCount: assertHeadingCount.bind(thisArg),
      assertKey: assertKey.bind(thisArg),
      assertTag: assertTag.bind(thisArg),
    }
  } catch (err) {
    assert.fail(`Invalid Markdown document! File: ${path}, Error: ${err.message}`)
  }

  callback(helpers)
}

export {parseMarkdown}
