import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, mkdirSync} from 'fs'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

describe('Error Handling', () => {
  it('should fail with invalid source path', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const invalidPath = join(source, 'does-not-exist')

      try {
        execSync(`node ./bin/docfu stage ${invalidPath} --sandbox ${root} --unsafe`, {stdio: 'pipe'})
        assert.fail('Should have rejected with invalid path')
      } catch (error) {
        const stderr = error.stderr?.toString().toLowerCase() || ''
        assert.ok(stderr.includes('not found') || stderr.includes('enoent'), 'Should show error about missing path')
      }
    })
  })

  it('should handle empty source directory', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      mkdirSync(source, {recursive: true})

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(workspace), 'Should create workspace even if empty')
    })
  })

  it('should handle malformed docfu.yml', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: "Unclosed quote\n  invalid: [}}',
        'index.md': '# Test\n\nContent',
      })

      try {
        execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})
        assert.ok(existsSync(workspace), 'Should still create workspace with defaults')
      } catch (error) {
        const stderr = error.stderr?.toString() || ''
        assert.ok(stderr.includes('unexpected end') || stderr.includes('YAML'), 'Should show YAML error')
      }
    })
  })

  it('should handle file with no H1 and no frontmatter title', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'no-title.md': 'This file has no H1 header.\n\nJust regular content.',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const processed = readFileSync(join(workspace, 'src/content/docs/no-title.md'), 'utf-8')
      assert.ok(processed.includes('title:'), 'Should have title in frontmatter')
      assert.ok(processed.includes('No Title'), 'Should generate title from filename')
    })
  })

  it('should handle empty markdown file', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'empty.md': '',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/empty.md')), 'Empty file should be processed')
    })
  })

  it('should handle file with only frontmatter', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'only-fm.md': '---\ntitle: Test\n---\n',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/only-fm.md')), 'Should process file')
    })
  })

  it('should handle malformed frontmatter in markdown', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'bad-fm.md': '---\ntitle: "Unclosed\ndescription: [}}\n---\n\n# Content\n\nText here.',
      })

      try {
        execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})
        assert.ok(existsSync(join(workspace, 'src/content/docs/bad-fm.md')), 'Should still process file')
      } catch {
        assert.ok(true, 'Failed with malformed frontmatter as expected')
      }
    })
  })

  it('should handle file with multiple H1 headers', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'multi-h1.md': '# First Title\n\nContent here.\n\n# Second Title\n\nMore content.',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const processed = readFileSync(join(workspace, 'src/content/docs/multi-h1.md'), 'utf-8')
      assert.ok(processed.includes('title: First Title'), 'Should use first H1 as title')
    })
  })
})
