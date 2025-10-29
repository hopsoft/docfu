import {assert, describe, it} from 'vitest'
import {join, readdir, realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import {parseMDX} from '../parsers/mdx-parser.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import {parseYAML} from '../parsers/yaml-parser.js'
import base from '../../lib/base.js'

describe('Build Command', () => {
  it('should build comprehensive site with all features', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test Documentation\n  url: https://test.example.com\nunlisted:\n  - _partials',
        'index.md': '# Home\n\nWelcome to the docs.',
        'with-components.md': `# Page with Components

  <Card title="Test Card">
  This is a card component
  </Card>

  <Badge text="Success Badge" variant="tip" />`,
        'with-markdoc.md': `# Page with Markdoc

  ## Important Note {% #important %}

  {% partial file="_partials/snippet.md" /%}`,
        '_partials/snippet.md': 'This is a reusable snippet from a partial.',
        'guides/getting-started.md': '# Getting Started\n\nGet started guide.',
        'api/reference.md': '# API Reference\n\nAPI documentation.',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      parseYAML(base.sandbox, 'config.yml', ({assertKey}) => {
        assertKey('site')
        assertKey('site.name', 'Test Documentation')
        assertKey('site.url', 'https://test.example.com')
      })

      parseJSON(base.sandbox, 'manifest.json', ({assertLength, assertContainsWhere}) => {
        assertLength('docs', 6)
        assertContainsWhere('docs', {title: 'Home'})
        assertContainsWhere('docs', {slug: 'with-components'})
        assertContainsWhere('docs', {title: 'Page with Components'})
        assertContainsWhere('docs', {slug: 'guides/getting-started'})
      })

      const docsdir = realpath(base.workspace, 'src', 'content', 'docs')
      assert(docsdir, `Should create: ${docsdir}`)

      parseMDX(docsdir, 'with-components.mdx', ({assertImport, assertElement, assertKey}) => {
        assertImport('Card')
        assertImport('Badge')
        assertImport('@astrojs/starlight/components')
        assertElement('Card')
        assertElement('Badge')
        assertKey('title')
      })

      parseMarkdown(docsdir, 'with-markdoc.mdoc', ({assertHeading, assertTag, assertKey}) => {
        assertHeading({text: 'Important Note', level: 2, id: 'important'})
        assertTag('partial')
        assertKey('title')
      })

      parseMarkdown(docsdir, 'index.md', ({assertKey, data}) => {
        assertKey('title')
        assert(!data.headings.some(h => h.level === 1 && h.text === 'Home'), 'H1 should be removed')
      })

      // Build artifacts
      const astroFiles = readdir(base.dist, '_astro')
      const cssFiles = astroFiles?.filter(f => f.endsWith('.css')) || []
      const jsFiles = astroFiles?.filter(f => f.endsWith('.js')) || []
      assert(cssFiles.length > 0, 'Should generate: CSS files')
      assert(jsFiles.length > 0, 'Should generate: JS bundles')
      assert(realpath(base.dist, '404.html'), `Should generate: ${join(base.dist, '404.html')}`)

      parseHTML(base.dist, 'index.html', ({assertSelector, assertText}) => {
        assertSelector('nav')
        assertSelector('main')
        assertText('title', 'Home')
        assertText('title', '|')
        assertSelector('nav a[href*="getting-started"], nav a[href*="guides"]')
        assertSelector('nav a[href*="reference"], nav a[href*="api"]')
      })

      parseHTML(base.dist, 'with-components', 'index.html', ({assertText}) => {
        assertText('main', 'Success Badge')
        assertText('main', 'Test Card')
        assertText('main [class*="card"]', 'This is a card component')
      })

      parseHTML(base.dist, 'with-markdoc', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('H2#important')
        assertText('main', 'reusable snippet from a partial')
      })

      parseHTML(base.dist, 'guides', 'getting-started', 'index.html', ({assertText}) => {
        assertText('title', 'Getting Started')
        assertText('main', 'Get started guide')
      })

      parseHTML(base.dist, 'api', 'reference', 'index.html', ({assertText}) => {
        assertText('title', 'API Reference')
        assertText('main', 'API documentation')
      })
    }))

  it('should support custom sandbox directory', async ({task}) =>
    quarantine(task, async sourcedir => {
      const sandbox = join(sourcedir, 'custom-sandbox')

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
      })

      await spawn(`node ./bin/docfu build --unsafe --sandbox ${sandbox} ${sourcedir}`)
      base.sandbox = sandbox

      assert.equal(sandbox, base.sandbox, `Should use sandbox: ${sandbox}`)
      assert(realpath(base.workspace), `Should create: ${base.workspace}`)
      assert(realpath(base.dist), `Should create: ${base.dist}`)
      assert.isUndefined(realpath(sourcedir, '.docfu'), `Should not create: ${join(sourcedir, '.docfu')}`)

      parseHTML(base.dist, 'index.html', ({assertText}) => assertText('title', 'Home'))
    }))
})
