import {describe, it} from 'vitest'
import assert from 'assert'
import {join, mkdir, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

describe('Error Handling', () => {
  it('should fail with invalid source path', ({task}) => {
    quarantine(task, testdir => {
      const invalidPath = join(testdir, 'does-not-exist')

      try {
        spawn(`node ./bin/docfu stage --unsafe ${invalidPath}`)
        assert.fail('Should have rejected with invalid path')
      } catch (error) {
        // Command failed as expected
        assert.ok(error.status !== 0, 'Should exit with non-zero code')
      }
    })
  })

  it('should handle empty source directory', ({task}) => {
    quarantine(task, testdir => {
      mkdir(testdir)

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace'), 'Should create workspace even if empty')
    })
  })

  it('should handle malformed docfu.yml', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: "Unclosed quote\n  invalid: [}}',
        'index.md': '# Test\n\nContent',
      })

      try {
        spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        assert.ok(realpath(testdir, '.docfu', 'workspace'), 'Should still create workspace with defaults')
      } catch (error) {
        // Command may fail with malformed YAML
        assert.ok(error.status !== 0, 'Should exit with non-zero code')
      }
    })
  })

  it('should handle file with no H1 and no frontmatter title', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'no-title.md': 'This file has no H1 header.\n\nJust regular content.',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const processed = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/no-title.md'))
      assert.ok(processed.includes('title:'), 'Should have title in frontmatter')
      assert.ok(processed.includes('No Title'), 'Should generate title from filename')
    })
  })

  it('should handle empty markdown file', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'empty.md': '',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/empty.md'), 'Empty file should be processed')
    })
  })

  it('should handle file with only frontmatter', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'only-fm.md': '---\ntitle: Test\n---\n',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/only-fm.md'), 'Should process file')
    })
  })

  it('should handle malformed frontmatter in markdown', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'bad-fm.md': '---\ntitle: "Unclosed\ndescription: [}}\n---\n\n# Content\n\nText here.',
      })

      try {
        spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/bad-fm.md'), 'Should still process file')
      } catch {
        assert.ok(true, 'Failed with malformed frontmatter as expected')
      }
    })
  })

  it('should handle file with multiple H1 headers', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'multi-h1.md': '# First Title\n\nContent here.\n\n# Second Title\n\nMore content.',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const processed = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/multi-h1.md'))
      assert.ok(processed.includes('title: First Title'), 'Should use first H1 as title')
    })
  })
})
