import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseJSON} from '../parsers/json-parser.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Manifest Generation', () => {
  it('should create manifest.json with correct structure', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home\n---\n\n# Welcome',
        'guide.md': '---\ntitle: Guide\n---\n\n# Guide',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert(data.config)
        assert(data.docs)
      })
    }))

  it('should include correct config in manifest', async ({task}) =>
    quarantine(task, async testdir => {
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

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert.equal(data.config.site.name, 'My Docs')
        assert.equal(data.config.site.url, 'https://docs.example.com')
        assert(data.config.exclude.includes('drafts'))
        assert(data.config.unlisted.includes('internal'))
      })
    }))

  it('should generate correct docs entries', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home Page\n---\n\n# Welcome',
        'guides/quickstart.md': '---\ntitle: Quick Start\n---\n\n# Getting Started',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert.equal(data.docs.length, 2)

        const index = data.docs.find(d => d.slug === 'index')
        assert.equal(index.title, 'Home Page')
        assert(index.files.source)
        assert(index.files.workspace)
        assert(index.files.workspace.endsWith('index.md'))

        const quickstart = data.docs.find(d => d.slug === 'guides/quickstart')
        assert.equal(quickstart.title, 'Quick Start')
        assert(quickstart.files.workspace.includes('guides'))
      })
    }))

  it('should generate correct slugs from file paths', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '# Root README',
        'api/index.md': '# API Index',
        'guides/Getting-Started.md': '# Guide',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert(data.docs.find(d => d.slug === 'index'))
        assert(data.docs.find(d => d.slug === 'api'))
        assert(data.docs.find(d => d.slug === 'guides/getting-started'))
      })
    }))

  it('should include components in manifest when present', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
        'components/MyButton.jsx': 'export default function MyButton() { return <button>Click</button> }',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert.equal(data.components.directory, 'components')
        assert.equal(data.components.items.find(c => c.name === 'MyButton').type, 'astro')
      })
    }))

  it('should include CSS in manifest when present', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
        'assets/custom.css': 'body { color: red; }',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) =>
        assert(data.css.items.find(c => c.path.includes('custom.css')))
      )
    }))

  it('should handle manifest without optional fields', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '# Home',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert(data.config)
        assert(data.docs)
        assert.isUndefined(data.components)
        assert.isUndefined(data.css)
      })
    }))

  it('should handle files with format conversion in manifest', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-jsx.md': '# Page\n\n<Card title="Test" />',
        'with-markdoc.md': '# Page\n\n{% aside type="note" %}Note{% /aside %}',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert(data.docs.find(d => d.slug === 'with-jsx').files.workspace.endsWith('.mdx'))
        assert(data.docs.find(d => d.slug === 'with-markdoc').files.workspace.endsWith('.mdoc'))
      })
    }))

  it('should respect components: false in config', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com\ncomponents: false',
        'components/MyComponent.astro': '<div>Test</div>',
        'index.md': '# Test',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      parseJSON(testdir, '.docfu', 'manifest.json', ({data}) => {
        assert(!data.components || data.components.items.length === 0, 'Should ignore components when disabled')
      })
    }))
})
