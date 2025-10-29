import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import {parseMDX} from '../parsers/mdx-parser.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://example.com'

describe('Relative Links', () => {
  it('should transform relative links to absolute site paths', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home\n\nSee [Getting Started](./getting-started.md)',
        'getting-started.md': '# Getting Started\n\nBack to [Home](./index.md)',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'index.md', ({data}) => {
        assert(data.content.includes('[Getting Started](/getting-started/)'))
        assert(!data.content.includes('./getting-started.md'))
      })
      parseMarkdown(docsdir, 'getting-started.md', ({data}) => assert(data.content.includes('[Home](/)')))
    }))

  it('should lowercase paths and preserve fragments', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'glossary.md': '# Glossary\n\n[Term 503B](./terms/503B.md#definition)',
        'terms/503B.md': '# 503B\n\n## Definition',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'glossary.md', ({data}) => {
        assert(data.content.includes('[Term 503B](/terms/503b/#definition)'))
        assert(!data.content.includes('./terms/503B'))
      })
    }))

  it('should handle parent directory references', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'guides/index.md': '# Guides\n\nSee [API](../api/reference.md)',
        'guides/quickstart.md': '# Quickstart\n\nBack to [Guides](./index.md)',
        'api/reference.md': '# Reference',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'guides', 'index.md', ({data}) => {
        assert(data.content.includes('[API](/api/reference/)'))
        assert(!data.content.includes('../api/reference'))
      })
      parseMarkdown(docsdir, 'guides', 'quickstart.md', ({data}) => assert(data.content.includes('[Guides](/guides/)')))
    }))

  it('should preserve frontmatter formatting', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'page.md': `---
title: Test Page
description: |
  Multi-line
  description
tags:
  - important
  - example
---
# Content

Link to [other](./other.md)`,
        'other.md': '# Other',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'page.md', ({data}) => {
        assert(data.content.includes('title: Test Page'))
        assert(data.content.includes('description: |'))
        assert(data.content.includes('  Multi-line'))
        assert(data.content.includes('tags:'))
        assert(data.content.includes('  - important'))
        assert(data.content.includes('[other](/other/)'))
      })
    }))

  it('should work with MDX files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'components/Button.jsx': 'export default function Button() { return <button>Click</button> }',
        'page.md': `# Page

import Button from './components/Button.jsx'

<Button />

See [docs](./docs/guide.md)`,
        'docs/guide.md': '# Guide',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMDX(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'page.mdx', ({data}) => {
        assert(data.content.includes('[docs](/docs/guide/)'))
        assert(data.content.includes("import Button from './components/Button.jsx'"))
      })
    }))

  it('should work with Markdoc files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'page.md': `# Page

{% aside type="note" %}
See the [guide](./guide.md) for details
{% /aside %}

Link to [reference](./api/reference.md)`,
        'guide.md': '# Guide',
        'api/reference.md': '# Reference',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'page.mdoc', ({assertTag, data}) => {
        assert(data.content.includes('[guide](/guide/)'))
        assert(data.content.includes('[reference](/api/reference/)'))
        assertTag('aside')
      })
    }))

  it('should not transform absolute or external links', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'page.md': `# Page

- [Absolute](/docs/api/)
- [External](https://example.com)
- [Anchor](#section)
- [Relative](./other.md)`,
        'other.md': '# Other',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'page.md', ({data}) => {
        assert(data.content.includes('[Absolute](/docs/api/)'))
        assert(data.content.includes('[External](https://example.com)'))
        assert(data.content.includes('[Anchor](#section)'))
        assert(data.content.includes('[Relative](/other/)'))
      })
    }))

  it('should strip .md, .mdx, and .mdoc extensions', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test',
        'index.md': `# Home

- [Markdown](./page.md)
- [MDX](./component.mdx)
- [Markdoc](./doc.mdoc)`,
        'page.md': '# Page',
        'component.md': 'import Foo from "./Foo.jsx"\n\n<Foo />',
        'doc.md': '{% aside %}Note{% /aside %}',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md', ({data}) => {
        assert(data.content.includes('[Markdown](/page/)'))
        assert(data.content.includes('[MDX](/component/)'))
        assert(data.content.includes('[Markdoc](/doc/)'))
      })
    }))
})
