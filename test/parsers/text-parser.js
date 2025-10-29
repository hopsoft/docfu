import {read} from '../../lib/file-system.js'
import {createParser, assertValueMatch} from './parser-utils.js'

/**
 * Parse text file and provide assertion helpers
 * @param {...string} args - Path segments to text file, with callback as last argument
 */
const parseText = createParser('text', path => {
  const content = read(path)
  return {
    path,
    content,
    assertContains: (matcher, msg) => assertValueMatch(content, matcher, path, msg),
  }
})

export {parseText}
