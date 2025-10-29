import {assert} from 'vitest'
import {XMLParser} from 'fast-xml-parser'
import {read} from '../../lib/file-system.js'
import {createParser, assertValueMatch} from './parser-utils.js'

/**
 * Assert XML has key/path with optional value check using Vitest's nested property assertions
 * @param {string} keyPath - Dot-notation path (e.g., 'sitemapindex', 'sitemapindex.sitemap')
 * @param {*} [expectedValue] - Optional expected value (uses deepStrictEqual)
 * @param {string} [msg] - Optional error message
 */
function assertKey(keyPath, expectedValue, msg) {
  if (expectedValue !== undefined)
    assert.deepNestedPropertyVal(this.data, keyPath, expectedValue, msg || `File: ${this.path}`)
  else assert.nestedProperty(this.data, keyPath, msg || `File: ${this.path}`)
}

/**
 * Parse XML file and provide data structure + assertion helpers
 * @param {...string} args - Path segments to XML file, with callback as last argument
 */
const parseXML = createParser('XML', path => {
  const content = read(path)
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })
  const data = parser.parse(content)
  const thisArg = {path, data}
  return {
    path,
    content,
    data,
    assertContains: (matcher, msg) => assertValueMatch(content, matcher, path, msg),
    assertKey: assertKey.bind(thisArg),
  }
})

export {parseXML}
