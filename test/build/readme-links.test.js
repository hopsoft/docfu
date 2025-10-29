/**
 * Build tests for README → index renaming and link transformation
 * Validates that the final HTML has correct hrefs
 */

import {describe, it} from 'vitest'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import base from '../../lib/base.js'

describe('README Links in Built HTML', () => {
  it('should transform README links and build correct page URLs', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'README.md': `---
title: Home
---

# Home

Links to READMEs:
- [Guides](guides/README.md)
- [API](api/README.md)`,
        'guides/README.md': `---
title: Guides
---

# Guides Landing`,
        'guides/getting-started.md': `---
title: Getting Started
---

# Getting Started

Navigation:
- [Home](../README.md)
- [Guides Home](./README.md)`,
        'api/README.md': `---
title: API
---

# API Reference`,
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Test root README becomes index.html
      parseHTML(base.dist, 'index.html', ({assertText, assertAttr}) => {
        assertText('main', 'Home')
        assertText('main', 'Links to READMEs')
        // Links should be transformed to /guides/ and /api/
        assertAttr('a[href="/guides/"]', 'href', '/guides/')
        assertAttr('a[href="/api/"]', 'href', '/api/')
      })

      // Test guides/README becomes guides/index.html
      parseHTML(base.dist, 'guides', 'index.html', ({assertText}) => {
        // When both frontmatter title and H1 exist: frontmatter wins, H1 is stripped
        assertText('title', 'Guides')
        assertText('h1', 'Guides')
      })

      // Test api/README becomes api/index.html
      parseHTML(base.dist, 'api', 'index.html', ({assertText}) => {
        // When both frontmatter title and H1 exist: frontmatter wins, H1 is stripped
        assertText('title', 'API')
        assertText('h1', 'API')
      })

      // Test relative README links are transformed correctly
      parseHTML(base.dist, 'guides', 'getting-started', 'index.html', ({assertText, assertAttr}) => {
        assertText('main', 'Getting Started')
        // ../README.md should become /
        assertAttr('a[href="/"]', 'href', '/')
        // ./README.md should become /guides/
        assertAttr('a[href="/guides/"]', 'href', '/guides/')
      })
    }))
})
