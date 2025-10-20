import {describe, it} from 'vitest'
import assert from 'assert'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {isolate, createFixtures, x} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://example.com'

describe('Relative Links', () => {
  it('should transform relative links to absolute site paths', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'index.md': '# Home\n\nSee [Getting Started](./getting-started.md)',
        'getting-started.md': '# Getting Started\n\nBack to [Home](./index.md)',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const indexContent = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(
        indexContent.includes('[Getting Started](/getting-started/)'),
        'Should transform relative link to absolute'
      )
      assert.ok(!indexContent.includes('./getting-started.md'), 'Should not have relative link')

      const startContent = await readFile(join(workspace, 'src/content/docs/getting-started.md'), 'utf-8')
      assert.ok(startContent.includes('[Home](/)'), 'Should transform index link to root')
    })
  })

  it('should lowercase paths and preserve fragments', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'glossary.md': '# Glossary\n\n[Term 503B](./terms/503B.md#definition)',
        'terms/503B.md': '# 503B\n\n## Definition',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/glossary.md'), 'utf-8')
      assert.ok(content.includes('[Term 503B](/terms/503b/#definition)'), 'Should lowercase path and preserve fragment')
      assert.ok(!content.includes('./terms/503B'), 'Should not have relative link')
    })
  })

  it('should handle parent directory references', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'guides/index.md': '# Guides\n\nSee [API](../api/reference.md)',
        'guides/quickstart.md': '# Quickstart\n\nBack to [Guides](./index.md)',
        'api/reference.md': '# Reference',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const guidesContent = await readFile(join(workspace, 'src/content/docs/guides/index.md'), 'utf-8')
      assert.ok(guidesContent.includes('[API](/api/reference/)'), 'Should transform parent directory link')
      assert.ok(!guidesContent.includes('../api/reference'), 'Should not have relative link')

      const quickstartContent = await readFile(join(workspace, 'src/content/docs/guides/quickstart.md'), 'utf-8')
      assert.ok(quickstartContent.includes('[Guides](/guides/)'), 'Should transform to /guides/ without index')
    })
  })

  it('should preserve frontmatter formatting', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/page.md'), 'utf-8')

      // Check frontmatter preserved
      assert.ok(content.includes('title: Test Page'), 'Should preserve title')
      assert.ok(content.includes('description: |'), 'Should preserve pipe literal')
      assert.ok(content.includes('  Multi-line'), 'Should preserve indented multi-line')
      assert.ok(content.includes('tags:'), 'Should preserve tags array')
      assert.ok(content.includes('  - important'), 'Should preserve list indentation')

      // Check link transformed
      assert.ok(content.includes('[other](/other/)'), 'Should transform link')
    })
  })

  it('should work with MDX files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'components/Button.jsx': 'export default function Button() { return <button>Click</button> }',
        'page.md': `# Page

import Button from './components/Button.jsx'

<Button />

See [docs](./docs/guide.md)`,
        'docs/guide.md': '# Guide',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/page.mdx'), 'utf-8')
      assert.ok(content.includes('[docs](/docs/guide/)'), 'Should transform relative links in MDX')
      assert.ok(content.includes("import Button from './components/Button.jsx'"), 'Should preserve component imports')
    })
  })

  it('should work with Markdoc files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'page.md': `# Page

{% aside type="note" %}
See the [guide](./guide.md) for details
{% /aside %}

Link to [reference](./api/reference.md)`,
        'guide.md': '# Guide',
        'api/reference.md': '# Reference',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/page.mdoc'), 'utf-8')
      assert.ok(content.includes('[guide](/guide/)'), 'Should transform relative links in Markdoc')
      assert.ok(content.includes('[reference](/api/reference/)'), 'Should transform nested paths')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve Markdoc tags')
    })
  })

  it('should not transform absolute or external links', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'page.md': `# Page

- [Absolute](/docs/api/)
- [External](https://example.com)
- [Anchor](#section)
- [Relative](./other.md)`,
        'other.md': '# Other',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/page.md'), 'utf-8')
      assert.ok(content.includes('[Absolute](/docs/api/)'), 'Should preserve absolute link')
      assert.ok(content.includes('[External](https://example.com)'), 'Should preserve external link')
      assert.ok(content.includes('[Anchor](#section)'), 'Should preserve anchor link')
      assert.ok(content.includes('[Relative](/other/)'), 'Should transform relative link only')
    })
  })

  it('should strip .md, .mdx, and .mdoc extensions', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test',
        'index.md': `# Home

- [Markdown](./page.md)
- [MDX](./component.mdx)
- [Markdoc](./doc.mdoc)`,
        'page.md': '# Page',
        'component.md': 'import Foo from "./Foo.jsx"\n\n<Foo />',
        'doc.md': '{% aside %}Note{% /aside %}',
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('[Markdown](/page/)'), 'Should strip .md extension')
      assert.ok(content.includes('[MDX](/component/)'), 'Should strip .mdx extension')
      assert.ok(content.includes('[Markdoc](/doc/)'), 'Should strip .mdoc extension')
    })
  })
})
