import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import {parseMDX} from '../parsers/mdx-parser.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Format Detection', () => {
  it('should keep plain markdown files as .md', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'plain-markdown.md': `# Plain Markdown

This is plain markdown with no special syntax.

## Section

Just regular markdown content with **bold** and _italic_ text.

### Code Block

\`\`\`javascript
const test = 'hello'
\`\`\`

No JSX components, no Markdoc tags.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert(realpath(docsdir, 'plain-markdown.md'))
      assert.isUndefined(realpath(docsdir, 'plain-markdown.mdx'))
      assert.isUndefined(realpath(docsdir, 'plain-markdown.mdoc'))
      parseMarkdown(docsdir, 'plain-markdown.md', ({assertHeading}) => assertHeading('Section', 2))
    }))

  it('should convert files with JSX components to .mdx', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-jsx-components.md': `# File with JSX Components

This file uses Starlight JSX components.

<Card title="Test Card">
This card should trigger conversion to .mdx
</Card>

<Badge variant="success">New Feature</Badge>

Content continues here.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert(realpath(docsdir, 'with-jsx-components.mdx'))
      assert.isUndefined(realpath(docsdir, 'with-jsx-components.md'))
      parseMDX(docsdir, 'with-jsx-components.mdx', ({assertImport, assertElement}) => {
        assertImport('Badge')
        assertImport('Card')
        assertElement('Card')
        assertElement('Badge')
      })
    }))

  it('should convert files with Markdoc syntax to .mdoc', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-markdoc-tags.md': `# File with Markdoc Tags

This file uses Markdoc tag syntax.

{% badge text="New" /%}

Content with markdoc tags should become .mdoc

{% aside type="note" %}
This is a note aside.
{% /aside %}

More content here.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert(realpath(docsdir, 'with-markdoc-tags.mdoc'))
      assert.isUndefined(realpath(docsdir, 'with-markdoc-tags.md'))
      parseMarkdown(docsdir, 'with-markdoc-tags.mdoc', ({assertTag}) => {
        assertTag('badge')
        assertTag('aside')
      })
    }))

  it('should detect heading badges and convert to .mdoc', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-heading-badges.md': `# Title :badge[v1.0]

Heading badges should trigger .mdoc conversion.

## Section :badge[Beta]

More content with inline :badge[text] that stays as-is.

### Another Section

Regular content.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'with-heading-badges.mdoc', ({assertTag, data}) => {
        assertTag('badge')
        assert(data.content.includes(':badge[text]'))
      })
    }))

  it('should handle GitHub alerts correctly', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-github-alerts.md': `# GitHub Alerts

Plain markdown with only GitHub alerts should stay as .md.

> [!NOTE]
> This is a note alert.

> [!TIP]
> This is a tip alert.

> [!WARNING]
> This is a warning alert.

Regular content.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'with-github-alerts.md', ({data}) => {
        assert(data.content.includes('> [!NOTE]'))
        assert.isNotOk(data.content.includes('{% aside'))
      })
    }))

  it('should convert GitHub alerts in files with badges', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'badges-and-alerts.md': `# Badges and Alerts :badge[Combined]

This file has both badges AND alerts, should become .mdoc.

## Section :badge[New]

> [!NOTE]
> This is a note alert

Content here.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'badges-and-alerts.mdoc', ({assertTag, data}) => {
        assertTag('aside')
        assertTag('badge')
        assert(data.content.includes('This is a note alert'))
      })
    }))

  it('should auto-import multiple Starlight components', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'multiple-components.md': `# Multiple Components

Test auto-importing multiple Starlight components.

<Badge variant="success">Status</Badge>

<Aside type="tip">
This is a tip.
</Aside>

<Steps>
1. First step
2. Second step
3. Third step
</Steps>

All components should be auto-imported alphabetically.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMDX(docsdir, 'multiple-components.mdx', ({assertImport, assertElement}) => {
        assertImport('Aside')
        assertImport('Badge')
        assertImport('Steps')
        assertElement('Badge')
        assertElement('Aside')
        assertElement('Steps')
      })
    }))

  it('should preserve existing .mdx files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'existing.mdx': `---
title: Existing MDX File
---

import CustomComponent from './custom'

# Existing MDX

This file is already .mdx and should be preserved.

<CustomComponent />

<Badge variant='success'>Test</Badge>

Existing imports should not be modified.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMDX(docsdir, 'existing.mdx', ({assertImport, assertElement}) => {
        assertImport('CustomComponent')
        assertElement('CustomComponent')
        assertElement('Badge')
      })
    }))

  it('should preserve existing .mdoc files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'existing.mdoc': `---
title: Existing Markdoc File
---

# Existing Markdoc

{% badge text="Markdoc" /%}

This file is already .mdoc and should be preserved.

{% aside type="note" %}
Existing markdoc content.
{% /aside %}

No changes needed.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      parseMarkdown(docsdir, 'existing.mdoc', ({assertTag}) => {
        assertTag('badge')
        assertTag('aside')
      })
    }))
})
