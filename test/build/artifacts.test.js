import {assert, describe, it} from 'vitest'
import {join, mkdir, realpath, write} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseXML} from '../parsers/xml-parser.js'
import {parseText} from '../parsers/text-parser.js'
import base from '../../lib/base.js'

describe('Build Artifacts', () => {
  it('should generate complete site with all expected build artifacts', async ({task}) =>
    quarantine(task, async sourcedir => {
      mkdir(sourcedir, 'public')

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test Documentation\n  url: https://docs.example.com',
        'index.md':
          '---\ntitle: Welcome\ndescription: Test documentation site\n---\n\n# Welcome\n\nContent with **bold** and *italic*.\n\n![Test Asset](./images/test-asset-unique.png)',
        'guide.md': '# Guide',
        'api.md': '# API',
        'images/icons/small.svg': '<svg></svg>',
      })

      write(join(sourcedir, 'public', 'favicon.ico'), 'fake-favicon-data')

      const pngData = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
      write(join(sourcedir, 'images', 'test-asset-unique.png'), pngData)

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Check 404 page
      parseHTML(base.dist, '404.html', ({assertText}) => {
        assertText('title', '404')
        assertText('body', '404')
      })

      // Check index.html - structure, metadata, assets, favicon, navigation, and images
      parseHTML(base.dist, 'index.html', ({assertSelector, assertText}) => {
        // Valid HTML structure
        assertSelector('html')
        assertSelector('head')
        assertSelector('body')
        assertSelector('meta[charset]')
        assertSelector('title')
        assertSelector('meta[name="viewport"]')

        // OpenGraph meta tags
        assertSelector('meta[property="og:title"]')
        assertSelector('meta[name="description"]')
        assertSelector('meta[property="og:site_name"], title')

        // CSS and JS assets
        assertSelector('link[rel="stylesheet"], style')
        assertSelector('script[src], script[type="module"]')

        // Favicon
        assertSelector('link[rel="icon"], link[rel="shortcut icon"]')

        // Navigation structure
        assertSelector('nav.sidebar')
        assertText('nav.sidebar', /guide/i)
        assertText('nav.sidebar', /api/i)

        // Image processing
        assertSelector('img[alt="Test Asset"]')
        assertSelector('img[src*="test-asset-unique"]')
      })

      // Asset directory and sitemap
      assert(realpath(base.dist, '_astro'), 'Should have _astro assets directory')

      // Sitemap with proper XML structure
      parseXML(base.dist, 'sitemap-index.xml', ({assertKey, assertContains}) => {
        assertKey('sitemapindex')
        assertKey('sitemapindex.sitemap')
        assertContains('example.com')
      })

      // llms.txt artifacts for AI/LLM consumption
      parseText(base.dist, 'llms.txt', ({assertContains}) => {
        assertContains('Documentation Sets')
        assertContains('llms-small.txt')
        assertContains('llms-full.txt')
      })

      parseText(base.dist, 'llms-small.txt', ({assertContains}) => {
        assertContains('<SYSTEM>')
        assertContains('Welcome')
      })

      parseText(base.dist, 'llms-full.txt', ({assertContains}) => {
        assertContains('Welcome')
      })
    }))
})
