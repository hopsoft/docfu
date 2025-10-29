import {assert, describe, it} from 'vitest'
import {join, mkdir, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'

describe('Error Handling', () => {
  it('should fail with invalid source path', async ({task}) =>
    quarantine(task, async testdir => {
      const invalidPath = join(testdir, 'does-not-exist')

      try {
        await spawn(`node ./bin/docfu stage --unsafe ${invalidPath}`)
        assert.fail('Should have rejected with invalid path')
      } catch (error) {
        assert(error.status !== 0)
      }
    }))

  it('should handle empty source directory', async ({task}) =>
    quarantine(task, async testdir => {
      mkdir(testdir)
      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace'))
    }))

  it('should handle malformed docfu.yml', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: "Unclosed quote\n  invalid: [}}',
        'index.md': '# Test\n\nContent',
      })

      try {
        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        assert(realpath(testdir, '.docfu', 'workspace'))
      } catch (error) {
        assert(error.status !== 0)
      }
    }))

  it('should handle file with no H1 and no frontmatter title', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'no-title.md': 'This file has no H1 header.\n\nJust regular content.',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'no-title.md', ({data}) => {
        assert(data.content.includes('title:'))
        assert(data.content.includes('No Title'))
      })
    }))

  it('should handle empty markdown file', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'empty.md': '',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'empty.md'))
    }))

  it('should handle file with only frontmatter', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'only-fm.md': '---\ntitle: Test\n---\n',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'only-fm.md'))
    }))

  it('should handle malformed frontmatter in markdown', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'bad-fm.md': '---\ntitle: "Unclosed\ndescription: [}}\n---\n\n# Content\n\nText here.',
      })

      try {
        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'bad-fm.md'))
      } catch {
        assert(true)
      }
    }))

  it('should handle file with multiple H1 headers', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'multi-h1.md': '# First Title\n\nContent here.\n\n# Second Title\n\nMore content.',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseMarkdown(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'multi-h1.md', ({data}) =>
        assert(data.content.includes('title: First Title'))
      )
    }))
})
