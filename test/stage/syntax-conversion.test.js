import {describe, it} from 'vitest'
import assert from 'assert'
import {join, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Syntax Conversion', () => {
  it('should preserve GitHub alerts in plain markdown', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'github-alerts.md': `# GitHub Alerts Only

> [!NOTE]
> This is a note.

> [!TIP]
> This is a tip.

> [!WARNING]
> This is a warning.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/github-alerts.md'), 'Should stay as .md')

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/github-alerts.md'))
      assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax')
      assert.ok(content.includes('> [!TIP]'), 'Should preserve TIP alert')
      assert.ok(content.includes('> [!WARNING]'), 'Should preserve WARNING alert')
      assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
    })
  })

  it('should convert GitHub alerts to markdoc in .mdoc files', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'alerts-with-badges.md': `# Alerts with Badges :badge[v1.0]

> [!NOTE]
> Combined with badges, this triggers .mdoc conversion.

## Section

Content here.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/alerts-with-badges.mdoc'),
        'Should become .mdoc'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/alerts-with-badges.mdoc'))
      assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc asides')
      assert.ok(content.includes('Combined with badges'), 'Should preserve alert content')
      assert.ok(!content.includes('> [!NOTE]'), 'Should not have GitHub alert syntax')
    })
  })

  it('should convert heading badges to markdoc tags', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'heading-badges.md': `# Title :badge[New]

## Features :badge[Beta]{variant=tip}

### Subsection

Content with inline :badge[text] preserved.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/heading-badges.mdoc'), 'Should become .mdoc')

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/heading-badges.mdoc'))
      assert.ok(content.includes('{% badge'), 'Should have markdoc badge tags')
      assert.ok(content.includes(':badge[text]'), 'Should preserve inline badge syntax')
    })
  })
})
