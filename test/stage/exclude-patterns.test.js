import {assert, describe, it} from 'vitest'
import {join, realpath, glob} from '../../lib/file-system.js'
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
  it('should exclude files matching directory patterns', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'drafts/draft1.md': '# Draft',
        'archive/old.md': '# Archive',
        'internal/secret.md': '# Internal',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'drafts'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'archive'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'internal'))
    }))

  it('should exclude files matching specific file patterns', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'specific-file.md': '# Specific',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'specific-file.md'))
    }))

  it('should exclude files matching glob patterns with suffix', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'feature-draft.md': '# Feature Draft',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'feature-draft.md'))
    }))

  it('should exclude files matching glob patterns with extension', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'backup.tmp.md': '# Backup',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'regular.md'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'backup.tmp.md'))
    }))

  it('should exclude directories matching glob patterns with prefix', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'temp-dir/file.md': '# Temp',
      })

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs', 'index.md'))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'temp-dir'))
    }))

  it('should handle mixed included and excluded files correctly', async ({task}) =>
    quarantine(task, async testdir => {
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

      await spawn(`node ./bin/docfu stage --unsafe --sandbox ${join(testdir, '.docfu')} ${testdir}`)
      const docs = join(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      const mdFiles = glob('**/*.md', docs)
      assert(mdFiles.some(f => f.endsWith('index.md')))
      assert(mdFiles.some(f => f.endsWith('regular.md')))
      assert.equal(mdFiles.length, 2)
    }))
})
