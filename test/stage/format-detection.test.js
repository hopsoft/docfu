import {describe, it} from 'vitest'
import assert from 'assert'
import {join, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Format Detection', () => {
  it('should keep plain markdown files as .md', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'plain-markdown.md'),
        'Plain markdown should stay as .md'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'plain-markdown.mdx'),
        undefined,
        'Should not become .mdx'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'plain-markdown.mdoc'),
        undefined,
        'Should not become .mdoc'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'plain-markdown.md'))
      assert.ok(content.includes('## Section'), 'Should preserve other content')
    })
  })

  it('should convert files with JSX components to .mdx', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-jsx-components.mdx'),
        'Should become .mdx'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-jsx-components.md'),
        undefined,
        'Original .md should not exist'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-jsx-components.mdx'))
      assert.ok(content.includes('import { Badge, Card } from'), 'Should auto-import components')
      assert.ok(content.includes('<Card title="Test Card">'), 'Should preserve JSX component')
      assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
    })
  })

  it('should convert files with Markdoc syntax to .mdoc', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-markdoc-tags.mdoc'),
        'Should become .mdoc'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-markdoc-tags.md'),
        undefined,
        'Original .md should not exist'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-markdoc-tags.mdoc'))
      assert.ok(content.includes('{% badge text="New" /%}'), 'Should preserve markdoc badges')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
    })
  })

  it('should detect heading badges and convert to .mdoc', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-heading-badges.md': `# Title :badge[v1.0]

Heading badges should trigger .mdoc conversion.

## Section :badge[Beta]

More content with inline :badge[text] that stays as-is.

### Another Section

Regular content.`,
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-heading-badges.mdoc'),
        'Should become .mdoc'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-heading-badges.mdoc'))
      assert.ok(content.includes('{% badge text="Beta" /%}'), 'Should convert H2 badge')
      assert.ok(content.includes(':badge[text]'), 'Should preserve inline badges')
    })
  })

  it('should handle GitHub alerts correctly', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-github-alerts.md'),
        'GitHub alerts alone should stay as .md'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'with-github-alerts.md'))
      assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax in .md')
      assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
    })
  })

  it('should convert GitHub alerts in files with badges', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'badges-and-alerts.md': `# Badges and Alerts :badge[Combined]

This file has both badges AND alerts, should become .mdoc.

## Section :badge[New]

> [!NOTE]
> This is a note alert

Content here.`,
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'badges-and-alerts.mdoc'),
        'Should become .mdoc'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'badges-and-alerts.mdoc'))
      assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc in .mdoc')
      assert.ok(content.includes('This is a note alert'), 'Should preserve alert content')
    })
  })

  it('should auto-import multiple Starlight components', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'multiple-components.mdx'),
        'Should become .mdx'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'multiple-components.mdx'))
      assert.ok(
        content.includes('import { Aside, Badge, Steps } from'),
        'Should import all used components alphabetically'
      )
      assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
      assert.ok(content.includes('<Aside type="tip">'), 'Should preserve Aside component')
      assert.ok(content.includes('<Steps>'), 'Should preserve Steps component')
    })
  })

  it('should preserve existing .mdx files', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'existing.mdx'),
        'Should preserve .mdx extension'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'existing.mdx'))
      assert.ok(content.includes('import CustomComponent from'), 'Should preserve existing imports')
      assert.ok(content.includes('<CustomComponent />'), 'Should preserve custom component')
    })
  })

  it('should preserve existing .mdoc files', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'existing.mdoc'),
        'Should preserve .mdoc extension'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'existing.mdoc'))
      assert.ok(content.includes('{% badge text="Markdoc" /%}'), 'Should preserve markdoc tags')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
    })
  })
})
