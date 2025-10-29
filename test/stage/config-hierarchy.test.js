import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseYAML} from '../parsers/yaml-parser.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'

describe('Configuration Hierarchy', () => {
  it('should merge multiple docfu.yml files', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Main Site\n  url: https://example.com\nexclude:\n  - drafts',
        'index.md': '# Home',
        'guides/docfu.yml': 'exclude:\n  - temp.md',
        'guides/guide.md': '# Guide',
        'guides/temp.md': '# Temp',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseYAML(testdir, '.docfu', 'config.yml', ({data}) => {
        assert(data?.site?.name === 'Main Site')
        assert(data?.exclude?.includes('drafts') || data?.exclude?.includes('temp.md'))
      })
    }))

  it('should inherit site config from root only', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Docs\n  url: https://docs.com',
        'index.md': '# Home',
        'api/docfu.yml': 'site:\n  name: API Docs\n  url: https://api.com',
        'api/reference.md': '# API',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseYAML(testdir, '.docfu', 'config.yml', ({data}) => {
        assert(data.site.name === 'Docs')
        assert(data.site.name !== 'API Docs')
      })
    }))

  it('should handle exclude patterns at different levels', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com\nexclude:\n  - drafts',
        'index.md': '# Home',
        'drafts/draft.md': '# Draft',
        'guides/docfu.yml': 'exclude:\n  - "*.tmp.md"',
        'guides/guide.md': '# Guide',
        'guides/notes.tmp.md': '# Temp Notes',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert.isUndefined(realpath(docsdir, 'drafts'))
      assert(realpath(docsdir, 'guides', 'guide.md'))
      assert.isUndefined(realpath(docsdir, 'guides', 'notes.tmp.md'))
    }))

  it('should support frontmatter defaults in config', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
        'api/docfu.yml': 'frontmatter:\n  sidebar:\n    badge:\n      text: API\n      variant: note',
        'api/reference.md': '# API Reference\n\nContent',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'api', 'reference.md', ({data}) => {
        assert(data.content.includes('sidebar:'))
        assert(data.content.includes('badge:'))
      })
    }))

  it('should handle file-specific config in docfu.yml', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': `site:
  name: Test
  url: https://test.com

'index.md':
  frontmatter:
    title: Custom Home Title
    description: Custom description`,
        'index.md': '# Home\n\nOriginal content',
        'other.md': '# Other\n\nContent',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const indexPath = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md')
      parseMarkdown(indexPath, ({data}) => {
        assert(data.content.includes('Custom Home Title'))
        assert(data.content.includes('Custom description'))
      })

      const otherPath = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'other.md')
      parseMarkdown(otherPath, ({data}) => assert(data.content.includes('title: Other')))
    }))

  it('should handle missing site config gracefully', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'exclude:\n  - drafts',
        'index.md': '# Home',
      })

      let exitCode = 0
      let stderr = ''
      try {
        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      } catch (error) {
        exitCode = error.status
        stderr = error.stderr?.toString() || ''
      }

      if (exitCode !== 0) assert(stderr.includes('site') || stderr.includes('required'))
      else assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
    }))

  it('should preserve user-defined frontmatter without overwriting', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'guide.md': `---
title: User Defined Title
description: User defined description
customField: custom value
author: Jane Doe
---

# This H1 Should Not Override Title

Content here.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const path = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'guide.md')
      parseMarkdown(path, ({data}) => {
        assert(data.content.includes('title: User Defined Title'))
        assert(data.content.includes('description: User defined description'))
        assert(data.content.includes('customField: custom value'))
        assert(data.content.includes('author: Jane Doe'))
        assert(!data.content.includes('# This H1 Should Not Override Title'))
        assert(data.content.includes('Content here.'))
      })
    }))
})
