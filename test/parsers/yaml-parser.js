import {assert} from 'vitest'
import {read} from '../../lib/file-system.js'
import yaml from 'js-yaml'
import {createParser, assertValueMatch} from './parser-utils.js'

/**
 * Assert YAML has key/path with optional value check using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path (e.g., 'site.name', 'items[0].id')
 * @param {*} [expectedValue] - Optional expected value (uses deepStrictEqual)
 * @param {string} [msg] - Optional error message
 */
function assertKey(keyPath, expectedValue, msg) {
  if (expectedValue !== undefined)
    assert.deepNestedPropertyVal(this.data, keyPath, expectedValue, msg || `File: ${this.path}`)
  else assert.nestedProperty(this.data, keyPath, msg || `File: ${this.path}`)
}

/**
 * Parse YAML frontmatter from file
 * @param {...string} args - Path segments to file, with callback as last argument
 */
const parseYAML = createParser('YAML', path => {
  const content = read(path)
  const data = yaml.load(content)
  const thisArg = {path, data}
  return {
    path,
    content,
    data,
    assertKey: assertKey.bind(thisArg),
    assertContains: (matcher, msg) => assertValueMatch(content, matcher, path, msg),
  }
})

export {parseYAML}
