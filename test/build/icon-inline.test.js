/**
 * Icon inline CSS class test
 * Verifies Icon component with .inline class displays icons inline across all formats
 */

import {assert, describe, it} from 'vitest'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import base from '../../lib/base.js'

describe('Icon Component - Inline CSS Class', () => {
  it('should support Icon with inline class across all formats and syntaxes', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        // .md with JSX (auto-detected as MDX)
        'md-jsx.md': `# Icon Inline Test - MD with JSX

This is text with an inline icon <Icon name="star" class="inline" /> in the middle.

Regular icon without inline:
<Icon name="rocket" />`,
        // .md with Markdoc tags (auto-detected as Markdoc)
        'md-tags.md': `# Icon Inline Test - MD with Markdoc Tags

This is text with an inline icon {% icon name="star" class="inline" /%} in the middle.

Regular icon without inline:
{% icon name="rocket" /%}`,
        // .mdx with Icon component
        'mdx-component.mdx': `---
title: MDX Component
---

# Icon Inline Test - MDX Component

This is text with an inline icon <Icon name="star" class="inline" /> in the middle.

Regular icon without inline:
<Icon name="rocket" />`,
        // .mdoc with Icon tag
        'mdoc-tag.mdoc': `---
title: Markdoc Tag
---

# Icon Inline Test - Markdoc Tag

This is text with an inline icon {% icon name="star" class="inline" /%} in the middle.

Regular icon without inline:
{% icon name="rocket" /%}`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Test .md with JSX (auto-detected and converted to .mdx)
      parseHTML(base.dist, 'md-jsx', 'index.html', ({assertText, assertSelector, assertAttr}) => {
        assertText('main', 'This is text with an inline icon')
        assertSelector('svg.inline')
        assertAttr('svg.inline', 'class', 'inline')
        assertSelector('svg.inline path')
        // Verify regular icon without inline class exists
        assertSelector('svg:not(.inline)')
      })

      // Test .md with Markdoc tags (auto-detected and converted to .mdoc)
      parseHTML(base.dist, 'md-tags', 'index.html', ({assertText, assertSelector, assertAttr}) => {
        assertText('main', 'This is text with an inline icon')
        assertSelector('svg.inline')
        assertAttr('svg.inline', 'class', 'inline')
        assertSelector('svg.inline path')
        // Verify regular icon without inline class exists
        assertSelector('svg:not(.inline)')
      })

      // Test .mdx with Icon component
      parseHTML(base.dist, 'mdx-component', 'index.html', ({assertText, assertSelector, assertAttr}) => {
        assertText('main', 'This is text with an inline icon')
        assertSelector('svg.inline')
        assertAttr('svg.inline', 'class', 'inline')
        assertSelector('svg.inline path')
        // Verify regular icon without inline class exists
        assertSelector('svg:not(.inline)')
      })

      // Test .mdoc with Icon tag
      parseHTML(base.dist, 'mdoc-tag', 'index.html', ({assertText, assertSelector, assertAttr}) => {
        assertText('main', 'This is text with an inline icon')
        assertSelector('svg.inline')
        assertAttr('svg.inline', 'class', 'inline')
        assertSelector('svg.inline path')
        // Verify regular icon without inline class exists
        assertSelector('svg:not(.inline)')
      })
    }))
})
