/**
 * CLI tests for common markdown features
 * Tests code blocks, tables, lists, links, blockquotes
 */

import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import base from '../../lib/base.js'

describe('Markdown Features', () => {
  it('should handle all standard markdown features', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': `# Home

[Go to guide](./guide.md)
[External link](https://example.com)

> This is a blockquote
> with multiple lines

Regular content after blockquote.`,
        'guide.md': `# Guide

[Back to home](./index.md)

\`\`\`javascript
const hello = 'world'
console.log(hello)
\`\`\`

\`\`\`python
def hello():
    print("world")
\`\`\`

Inline code: \`console.log()\` and \`myVar\` are important.`,
        'tables.md': `# Tables

| Feature | Status |
|---------|--------|
| Tables  | ✓      |
| Lists   | ✓      |

More content here.`,
        'lists.md': `# Lists

Unordered list:
- Item 1
- Item 2
  - Nested item
  - Another nested
- Item 3

Ordered list:
1. First
2. Second
3. Third

Task list:
- [ ] Todo item
- [x] Completed item`,
        'emphasis.md': `# Emphasis

This is **bold text** and this is *italic text*.

You can also use __bold__ and _italic_.

And ***bold italic*** text.

---

Second section after horizontal rule.`,
        'anchors.md': `# Documentation

## Installation

Content about installation.

## Usage

Content about usage.

[Jump to Installation](#installation)

> **Note:** Important information in blockquote`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify internal and external links + blockquotes
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertSelector('a[href*="guide"]')
        assertSelector('a[href*="example.com"]')
        assertText('main', 'Go to guide')
        assertText('main', 'External link')
        assertText('main', 'This is a blockquote')
      })

      // Verify code blocks
      parseHTML(base.dist, 'guide', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('a')
        assertText('main', 'Back to home')
        assertText('main', 'const hello')
        assertText('main', 'def hello')
        assertText('main', 'console.log()')
        assertSelector('code')
        assertSelector('pre')
      })

      // Verify tables
      parseHTML(base.dist, 'tables', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('table')
        assertSelector('th')
        assertSelector('td')
        assertText('table', 'Feature')
        assertText('table', 'Status')
      })

      // Verify lists
      parseHTML(base.dist, 'lists', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('ul')
        assertSelector('ol')
        assertSelector('li')
        assertText('main', 'Item 1')
        assertText('main', 'First')
      })

      // Verify emphasis and horizontal rules
      parseHTML(base.dist, 'emphasis', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('strong')
        assertSelector('em')
        assertSelector('hr')
        assertText('main', 'bold text')
        assertText('main', 'italic text')
      })

      // Verify anchor links to headings + blockquotes in same file
      parseHTML(base.dist, 'anchors', 'index.html', ({assertText, assertSelector}) => {
        assertSelector('h2[id*="installation"]')
        assertSelector('h2[id*="usage"]')
        assertSelector('a[href*="#installation"]')
        assertText('main', 'Important information')
      })
    }))
})
