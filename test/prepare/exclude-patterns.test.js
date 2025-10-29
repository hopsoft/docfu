import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readdir} from 'fs/promises'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

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
  it('should exclude files matching directory patterns', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'drafts/draft1.md': '# Draft',
        'archive/old.md': '# Archive',
        'internal/secret.md': '# Internal',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should be included')

      assert.ok(!existsSync(join(workspace, 'drafts')), 'drafts directory should not exist')
      assert.ok(!existsSync(join(workspace, 'archive')), 'archive directory should not exist')
      assert.ok(!existsSync(join(workspace, 'internal')), 'internal directory should not exist')
    })
  })

  it('should exclude files matching specific file patterns', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'specific-file.md': '# Specific',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should be included')
      assert.ok(existsSync(join(workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

      assert.ok(
        !existsSync(join(workspace, 'src/content/docs/specific-file.md')),
        'specific-file.md should be excluded'
      )
    })
  })

  it('should exclude files matching glob patterns with suffix', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'feature-draft.md': '# Feature Draft',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should be included')
      assert.ok(existsSync(join(workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

      assert.ok(
        !existsSync(join(workspace, 'src/content/docs/feature-draft.md')),
        'feature-draft.md should be excluded'
      )
    })
  })

  it('should exclude files matching glob patterns with extension', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'backup.tmp.md': '# Backup',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should be included')
      assert.ok(existsSync(join(workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

      assert.ok(!existsSync(join(workspace, 'backup.tmp.md')), 'backup.tmp.md should be excluded')
    })
  })

  it('should exclude directories matching glob patterns with prefix', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'temp-dir/file.md': '# Temp',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should be included')

      assert.ok(!existsSync(join(workspace, 'temp-dir')), 'temp-dir should be excluded')
    })
  })

  it('should list excluded patterns in processing output', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
      })

      const result = execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {
        encoding: 'utf-8',
      })

      assert.ok(result.includes('Exclude patterns:'), 'Should show exclude patterns header')
      assert.ok(result.includes('drafts'), 'Should list drafts pattern')
      assert.ok(result.includes('archive'), 'Should list archive pattern')
      assert.ok(result.includes('*-draft.md'), 'Should list *-draft.md pattern')
      assert.ok(result.includes('*.tmp.md'), 'Should list *.tmp.md pattern')
    })
  })

  it('should handle mixed included and excluded files correctly', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': doccfuYml,
        'index.md': '# Home',
        'regular.md': '# Regular',
        'specific-file.md': '# Specific',
        'feature-draft.md': '# Feature Draft',
        'backup.tmp.md': '# Backup',
        'drafts/draft1.md': '# Draft',
        'archive/old.md': '# Archive',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      const docs = join(workspace, 'src/content/docs')
      const files = await readdir(docs, {recursive: true})
      const mdFiles = files.filter(f => f.endsWith('.md'))

      assert.ok(mdFiles.includes('index.md'), 'Should include index.md')
      assert.ok(mdFiles.includes('regular.md'), 'Should include regular.md')
      assert.strictEqual(mdFiles.length, 2, 'Should only have 2 markdown files')
    })
  })
})
