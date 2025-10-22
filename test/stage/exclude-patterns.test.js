import {describe, it} from 'vitest'
import assert from 'assert'
import {join, realpath, walk} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const doccfuYml = `site:
  name: Test Docs
  url: https://test.example.com

exclude:
  - drafts
  - archive
  - internal
  - temp-*
  - '*-draft.md'
  - '*.tmp.md'
  - specific-file.md`

describe('Exclude Patterns', () => {
  it('should exclude files matching directory patterns', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'drafts/draft1.md': '# Draft',
        'archive/old.md': '# Archive',
        'internal/secret.md': '# Internal',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'),
        'index.md should be included'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'drafts'),
        undefined,
        'drafts directory should not exist'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'archive'),
        undefined,
        'archive directory should not exist'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'internal'),
        undefined,
        'internal directory should not exist'
      )
    })
  })

  it('should exclude files matching specific file patterns', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'specific-file.md': '# Specific',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'),
        'index.md should be included'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'),
        'regular.md should be included'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'specific-file.md'),
        undefined,
        'specific-file.md should be excluded'
      )
    })
  })

  it('should exclude files matching glob patterns with suffix', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'feature-draft.md': '# Feature Draft',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'),
        'index.md should be included'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'),
        'regular.md should be included'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'feature-draft.md'),
        undefined,
        'feature-draft.md should be excluded'
      )
    })
  })

  it('should exclude files matching glob patterns with extension', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'backup.tmp.md': '# Backup',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'),
        'index.md should be included'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'),
        'regular.md should be included'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'backup.tmp.md'),
        undefined,
        'backup.tmp.md should be excluded'
      )
    })
  })

  it('should exclude directories matching glob patterns with prefix', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'temp-dir/file.md': '# Temp',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'),
        'index.md should be included'
      )
      assert.strictEqual(realpath(testdir, '.docfu', 'workspace', 'temp-dir'), undefined, 'temp-dir should be excluded')
    })
  })

  it('should handle mixed included and excluded files correctly', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'specific-file.md': '# Specific',
        'feature-draft.md': '# Feature Draft',
        'backup.tmp.md': '# Backup',
        'drafts/draft1.md': '# Draft',
        'archive/old.md': '# Archive',
      })

      spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)

      const docs = join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      const mdFiles = walk(docs, f => f.endsWith('.md'))

      assert.ok(
        mdFiles.some(f => f.endsWith('index.md')),
        'Should include index.md'
      )
      assert.ok(
        mdFiles.some(f => f.endsWith('regular.md')),
        'Should include regular.md'
      )
      assert.strictEqual(mdFiles.length, 2, 'Should only have 2 markdown files')
    })
  })
})
