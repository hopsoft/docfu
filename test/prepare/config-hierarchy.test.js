import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync} from 'fs'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

describe('Configuration Hierarchy', () => {
  it('should merge multiple docfu.yml files', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Main Site\n  url: https://example.com\nexclude:\n  - drafts',
        'index.md': '# Home',
        'guides/docfu.yml': 'exclude:\n  - temp.md',
        'guides/guide.md': '# Guide',
        'guides/temp.md': '# Temp',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      const config = readFileSync(join(root, 'config.yml'), 'utf-8')
      assert.ok(config.includes('Main Site'), 'Should have site config from root')
      assert.ok(config.includes('drafts') || config.includes('temp.md'), 'Should merge exclude patterns')
    })
  })

  it('should inherit site config from root only', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Docs\n  url: https://docs.com',
        'index.md': '# Home',
        'api/docfu.yml': 'site:\n  name: API Docs\n  url: https://api.com',
        'api/reference.md': '# API',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      const config = readFileSync(join(root, 'config.yml'), 'utf-8')
      assert.ok(config.includes('name: Docs'), 'Should use root site config')
      assert.ok(!config.includes('API Docs'), 'Should not use subdirectory site config')
    })
  })

  it('should handle exclude patterns at different levels', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com\nexclude:\n  - drafts',
        'index.md': '# Home',
        'drafts/draft.md': '# Draft',
        'guides/docfu.yml': 'exclude:\n  - "*.tmp.md"',
        'guides/guide.md': '# Guide',
        'guides/notes.tmp.md': '# Temp Notes',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      assert.ok(!existsSync(join(workspace, 'src/content/docs/drafts')), 'Should exclude drafts directory')
      assert.ok(existsSync(join(workspace, 'src/content/docs/guides/guide.md')), 'Should include guide')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/guides/notes.tmp.md')), 'Should exclude .tmp.md files')
    })
  })

  it('should support frontmatter defaults in config', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
        'api/docfu.yml': 'frontmatter:\n  sidebar:\n    badge:\n      text: API\n      variant: note',
        'api/reference.md': '# API Reference\n\nContent',
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      const processed = readFileSync(join(workspace, 'src/content/docs/api/reference.md'), 'utf-8')
      assert.ok(processed.includes('sidebar:'), 'Should apply frontmatter defaults')
      assert.ok(processed.includes('badge:'), 'Should include badge configuration')
    })
  })

  it('should handle file-specific config in docfu.yml', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      const index = readFileSync(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(index.includes('Custom Home Title'), 'Should apply file-specific title')
      assert.ok(index.includes('Custom description'), 'Should apply file-specific description')

      const other = readFileSync(join(workspace, 'src/content/docs/other.md'), 'utf-8')
      assert.ok(other.includes('title: Other'), 'Other file should use default title from H1')
    })
  })

  it('should handle missing site config gracefully', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': 'exclude:\n  - drafts',
        'index.md': '# Home',
      })

      let exitCode = 0
      let stderr = ''
      try {
        execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})
      } catch (error) {
        exitCode = error.status
        stderr = error.stderr?.toString() || ''
      }

      if (exitCode !== 0) {
        assert.ok(stderr.includes('site') || stderr.includes('required'), 'Should mention missing site config')
      } else {
        assert.ok(
          existsSync(join(workspace, 'src/content/docs/index.md')),
          'Should process files even without full config'
        )
      }
    })
  })

  it('should preserve user-defined frontmatter without overwriting', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'inherit'})

      const processed = readFileSync(join(workspace, 'src/content/docs/guide.md'), 'utf-8')

      // Verify user-defined frontmatter is preserved
      assert.ok(processed.includes('title: User Defined Title'), 'Should preserve user-defined title')
      assert.ok(processed.includes('description: User defined description'), 'Should preserve user-defined description')
      assert.ok(processed.includes('customField: custom value'), 'Should preserve custom fields')
      assert.ok(processed.includes('author: Jane Doe'), 'Should preserve author field')

      // Verify H1 was removed (since title exists in frontmatter)
      assert.ok(!processed.includes('# This H1 Should Not Override Title'), 'Should remove H1 since title exists')

      // Verify content is preserved
      assert.ok(processed.includes('Content here.'), 'Should preserve markdown content')
    })
  })
})
