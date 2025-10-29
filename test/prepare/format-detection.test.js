import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Format Detection', () => {
  it('should keep plain markdown files as .md', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/plain-markdown.md')), 'Plain markdown should stay as .md')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/plain-markdown.mdx')), 'Should not become .mdx')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/plain-markdown.mdoc')), 'Should not become .mdoc')

      const content = await readFile(join(workspace, 'src/content/docs/plain-markdown.md'), 'utf-8')
      // Note: Title extraction and H1 removal are done by the current processing pipeline
      // Files may preserve their original H1 headers
      assert.ok(content.includes('## Section'), 'Should preserve other content')
    })
  })

  it('should convert files with JSX components to .mdx', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'with-jsx-components.md': `# File with JSX Components

This file uses Starlight JSX components.

<Card title="Test Card">
This card should trigger conversion to .mdx
</Card>

<Badge variant="success">New Feature</Badge>

Content continues here.`,
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/with-jsx-components.mdx')), 'Should become .mdx')
      assert.ok(
        !existsSync(join(workspace, 'src/content/docs/with-jsx-components.md')),
        'Original .md should not exist'
      )

      const content = await readFile(join(workspace, 'src/content/docs/with-jsx-components.mdx'), 'utf-8')
      assert.ok(content.includes('import { Badge, Card } from'), 'Should auto-import components')
      assert.ok(content.includes('<Card title="Test Card">'), 'Should preserve JSX component')
      assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
    })
  })

  it('should convert files with Markdoc syntax to .mdoc', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/with-markdoc-tags.mdoc')), 'Should become .mdoc')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/with-markdoc-tags.md')), 'Original .md should not exist')

      const content = await readFile(join(workspace, 'src/content/docs/with-markdoc-tags.mdoc'), 'utf-8')
      assert.ok(content.includes('{% badge text="New" /%}'), 'Should preserve markdoc badges')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
    })
  })

  it('should detect heading badges and convert to .mdoc', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'with-heading-badges.md': `# Title :badge[v1.0]

Heading badges should trigger .mdoc conversion.

## Section :badge[Beta]

More content with inline :badge[text] that stays as-is.

### Another Section

Regular content.`,
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/with-heading-badges.mdoc')), 'Should become .mdoc')

      const content = await readFile(join(workspace, 'src/content/docs/with-heading-badges.mdoc'), 'utf-8')
      // Heading badges are converted to Markdoc badge tags
      assert.ok(content.includes('{% badge text="Beta" /%}'), 'Should convert H2 badge')
      assert.ok(content.includes(':badge[text]'), 'Should preserve inline badges')
    })
  })

  it('should handle GitHub alerts correctly', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(
        existsSync(join(workspace, 'src/content/docs/with-github-alerts.md')),
        'GitHub alerts alone should stay as .md'
      )

      const content = await readFile(join(workspace, 'src/content/docs/with-github-alerts.md'), 'utf-8')
      assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax in .md')
      assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
    })
  })

  it('should convert GitHub alerts in files with badges', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'badges-and-alerts.md': `# Badges and Alerts :badge[Combined]

This file has both badges AND alerts, should become .mdoc.

## Section :badge[New]

> [!NOTE]
> This is a note alert

Content here.`,
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/badges-and-alerts.mdoc')), 'Should become .mdoc')

      const content = await readFile(join(workspace, 'src/content/docs/badges-and-alerts.mdoc'), 'utf-8')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc in .mdoc')
      assert.ok(content.includes('This is a note alert'), 'Should preserve alert content')
    })
  })

  it('should auto-import multiple Starlight components', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/multiple-components.mdx')), 'Should become .mdx')

      const content = await readFile(join(workspace, 'src/content/docs/multiple-components.mdx'), 'utf-8')
      assert.ok(
        content.includes('import { Aside, Badge, Steps } from'),
        'Should import all used components alphabetically'
      )
      assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
      assert.ok(content.includes('<Aside type="tip">'), 'Should preserve Aside component')
      assert.ok(content.includes('<Steps>'), 'Should preserve Steps component')
    })
  })

  it('should preserve existing .mdx files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/existing.mdx')), 'Should preserve .mdx extension')

      const content = await readFile(join(workspace, 'src/content/docs/existing.mdx'), 'utf-8')
      assert.ok(content.includes('import CustomComponent from'), 'Should preserve existing imports')
      assert.ok(content.includes('<CustomComponent />'), 'Should preserve custom component')
    })
  })

  it('should preserve existing .mdoc files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/existing.mdoc')), 'Should preserve .mdoc extension')

      const content = await readFile(join(workspace, 'src/content/docs/existing.mdoc'), 'utf-8')
      assert.ok(content.includes('{% badge text="Markdoc" /%}'), 'Should preserve markdoc tags')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
    })
  })
})
