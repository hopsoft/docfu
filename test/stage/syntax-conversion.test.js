import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {isolate, createFixtures, x} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Syntax Conversion', () => {
  it('should preserve GitHub alerts in plain markdown', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'github-alerts.md': `# GitHub Alerts Only

> [!NOTE]
> This is a note.

> [!TIP]
> This is a tip.

> [!WARNING]
> This is a warning.`,
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      assert.ok(existsSync(join(workspace, 'src/content/docs/github-alerts.md')), 'Should stay as .md')

      const content = await readFile(join(workspace, 'src/content/docs/github-alerts.md'), 'utf-8')
      assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax')
      assert.ok(content.includes('> [!TIP]'), 'Should preserve TIP alert')
      assert.ok(content.includes('> [!WARNING]'), 'Should preserve WARNING alert')
      assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
    })
  })

  it('should convert GitHub alerts to markdoc in .mdoc files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'alerts-with-badges.md': `# Alerts with Badges :badge[v1.0]

> [!NOTE]
> Combined with badges, this triggers .mdoc conversion.

## Section

Content here.`,
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      assert.ok(existsSync(join(workspace, 'src/content/docs/alerts-with-badges.mdoc')), 'Should become .mdoc')

      const content = await readFile(join(workspace, 'src/content/docs/alerts-with-badges.mdoc'), 'utf-8')
      assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc asides')
      assert.ok(content.includes('Combined with badges'), 'Should preserve alert content')
      assert.ok(!content.includes('> [!NOTE]'), 'Should not have GitHub alert syntax')
    })
  })

  it('should convert heading badges to markdoc tags', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'heading-badges.md': `# Title :badge[New]

## Features :badge[Beta]{variant=tip}

### Subsection

Content with inline :badge[text] preserved.`,
      })

      x(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`)

      assert.ok(existsSync(join(workspace, 'src/content/docs/heading-badges.mdoc')), 'Should become .mdoc')

      const content = await readFile(join(workspace, 'src/content/docs/heading-badges.mdoc'), 'utf-8')
      assert.ok(content.includes('{% badge'), 'Should have markdoc badge tags')
      assert.ok(content.includes(':badge[text]'), 'Should preserve inline badge syntax')
    })
  })
})
