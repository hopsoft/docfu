import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Syntax Conversion', () => {
  it('should preserve GitHub alerts in plain markdown', async ({task}) =>
    quarantine(task, async testdir => {
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

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'github-alerts.md', ({data}) => {
        assert(data.content.includes('> [!NOTE]'))
        assert(data.content.includes('> [!TIP]'))
        assert(data.content.includes('> [!WARNING]'))
        assert(!data.content.includes('{% aside'))
      })
    }))

  it('should convert GitHub alerts to markdoc in .mdoc files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'alerts-with-badges.md': `# Alerts with Badges :badge[v1.0]

> [!NOTE]
> Combined with badges, this triggers .mdoc conversion.

## Section

Content here.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      parseMarkdown(
        testdir,
        '.docfu',
        'workspace',
        'src',
        'content',
        'docs',
        'alerts-with-badges.mdoc',
        ({assertTag, data}) => {
          assertTag('aside')
          assert(data.content.includes('Combined with badges'))
          assert(!data.content.includes('> [!NOTE]'))
        }
      )
    }))

  it('should convert heading badges to markdoc tags', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'heading-badges.md': `# Title :badge[New]

## Features :badge[Beta]{variant=tip}

### Subsection

Content with inline :badge[text] preserved.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      parseMarkdown(
        testdir,
        '.docfu',
        'workspace',
        'src',
        'content',
        'docs',
        'heading-badges.mdoc',
        ({assertTag, data}) => {
          assertTag('badge')
          assert(data.content.includes(':badge[text]'))
        }
      )
    }))
})
