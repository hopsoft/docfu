import {describe, it} from 'vitest'
import assert from 'assert'
import {join, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Manifest Generation', () => {
  it('should create manifest.json with correct structure', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home\n---\n\n# Welcome',
        'guide.md': '---\ntitle: Guide\n---\n\n# Guide',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifestPath = realpath(testdir, '.docfu', 'manifest.json')
      assert.ok(manifestPath, 'manifest.json should exist')

      const manifest = JSON.parse(read(manifestPath))

      // Verify top-level structure
      assert.ok(manifest.config, 'Should have config')
      assert.ok(Array.isArray(manifest.docs), 'Should have docs array')
    })
  })

  it('should include correct config in manifest', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': `site:
  name: My Docs
  url: https://docs.example.com
exclude:
  - drafts
unlisted:
  - internal`,
        'index.md': '# Home',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      assert.strictEqual(manifest.config.site.name, 'My Docs', 'Should have correct site name')
      assert.strictEqual(manifest.config.site.url, 'https://docs.example.com', 'Should have correct site URL')
      assert.ok(Array.isArray(manifest.config.exclude), 'Should have exclude array')
      assert.ok(manifest.config.exclude.includes('drafts'), 'Should include exclude patterns')
      assert.ok(Array.isArray(manifest.config.unlisted), 'Should have unlisted array')
      assert.ok(manifest.config.unlisted.includes('internal'), 'Should include unlisted patterns')
    })
  })

  it('should generate correct docs entries', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home Page\n---\n\n# Welcome',
        'guides/quickstart.md': '---\ntitle: Quick Start\n---\n\n# Getting Started',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      assert.strictEqual(manifest.docs.length, 2, 'Should have 2 docs entries')

      // Find the index entry
      const indexEntry = manifest.docs.find(d => d.slug === 'index')
      assert.ok(indexEntry, 'Should have index entry')
      assert.strictEqual(indexEntry.title, 'Home Page', 'Should have correct title')
      assert.ok(indexEntry.files.source, 'Should have source file path')
      assert.ok(indexEntry.files.workspace, 'Should have workspace file path')
      assert.ok(indexEntry.files.workspace.endsWith('index.md'), 'Workspace path should end with index.md')

      // Find the quickstart entry
      const quickstartEntry = manifest.docs.find(d => d.slug === 'guides/quickstart')
      assert.ok(quickstartEntry, 'Should have quickstart entry')
      assert.strictEqual(quickstartEntry.title, 'Quick Start', 'Should have correct title')
      assert.ok(quickstartEntry.files.workspace.includes('guides'), 'Should preserve directory structure')
    })
  })

  it('should generate correct slugs from file paths', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '# Root README',
        'api/index.md': '# API Index',
        'guides/Getting-Started.md': '# Guide',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      // README.md -> index -> slug "index"
      const rootEntry = manifest.docs.find(d => d.slug === 'index')
      assert.ok(rootEntry, 'README.md should become slug "index"')

      // api/index.md -> slug "api"
      const apiEntry = manifest.docs.find(d => d.slug === 'api')
      assert.ok(apiEntry, 'api/index.md should become slug "api"')

      // guides/Getting-Started.md -> slug "guides/getting-started" (lowercase)
      const guideEntry = manifest.docs.find(d => d.slug === 'guides/getting-started')
      assert.ok(guideEntry, 'Should lowercase slugs')
    })
  })

  it('should include components in manifest when present', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
        'components/MyButton.jsx': 'export default function MyButton() { return <button>Click</button> }',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      assert.ok(manifest.components, 'Should have components object')
      assert.strictEqual(manifest.components.directory, 'components', 'Should have correct directory')
      assert.ok(Array.isArray(manifest.components.items), 'Should have components items array')
      assert.ok(manifest.components.items.length > 0, 'Should have at least one component')

      const button = manifest.components.items.find(c => c.name === 'MyButton')
      assert.ok(button, 'Should have MyButton component')
      assert.strictEqual(button.type, 'astro', 'Should have type astro')
    })
  })

  it('should include CSS in manifest when present', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
        'assets/custom.css': 'body { color: red; }',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      assert.ok(manifest.css, 'Should have css object')
      assert.ok(Array.isArray(manifest.css.items), 'Should have css items array')
      assert.ok(manifest.css.items.length > 0, 'Should have at least one CSS file')

      const customCss = manifest.css.items.find(c => c.path.includes('custom.css'))
      assert.ok(customCss, 'Should have custom.css in manifest')
    })
  })

  it('should handle manifest without optional fields', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      // Should have required fields
      assert.ok(manifest.config, 'Should have config')
      assert.ok(manifest.docs, 'Should have docs')

      // Optional fields should not exist if no components/CSS
      assert.strictEqual(manifest.components, undefined, 'Should not have components when none exist')
      assert.strictEqual(manifest.css, undefined, 'Should not have css when none exist')
    })
  })

  it('should handle files with format conversion in manifest', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-jsx.md': '# Page\n\n<Card title="Test" />',
        'with-markdoc.md': '# Page\n\n{% aside type="note" %}Note{% /aside %}',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const manifest = JSON.parse(read(join(testdir, '.docfu', 'manifest.json')))

      const jsxEntry = manifest.docs.find(d => d.slug === 'with-jsx')
      assert.ok(jsxEntry, 'Should have with-jsx entry')
      assert.ok(jsxEntry.files.workspace.endsWith('.mdx'), 'Should show .mdx extension in workspace path')

      const markdocEntry = manifest.docs.find(d => d.slug === 'with-markdoc')
      assert.ok(markdocEntry, 'Should have with-markdoc entry')
      assert.ok(markdocEntry.files.workspace.endsWith('.mdoc'), 'Should show .mdoc extension in workspace path')
    })
  })
})
