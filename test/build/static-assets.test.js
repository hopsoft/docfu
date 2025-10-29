/**
 * CLI tests for static asset handling
 * Tests images, PDFs, CSS, JS, and other non-markdown files
 */

import {assert, describe, it} from 'vitest'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseText} from '../parsers/text-parser.js'
import {parseHTML} from '../parsers/html-parser.js'
import {realpath} from '../../lib/file-system.js'
import base from '../../lib/base.js'

describe('Static Assets', () => {
  it('should handle assets referenced in markdown (images, PDFs)', async ({task}) =>
    quarantine(task, async sourcedir => {
      // Create minimal valid 1x1 PNG (transparent)
      const pngData = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home\n\n![Logo](./images/logo.png)\n\n[Download PDF](./guide.pdf)\n\nContent here.',
        'images/logo.png': pngData,
        'guide.pdf': 'fake-pdf-data',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify HTML contains content and references (Astro processes images/PDFs and may rename them)
      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('body', 'Home')
        assertText('body', 'Content here')
        assertText('body', 'Download PDF')
      })
    }))

  it('should transform relative asset links to absolute paths', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home\n\n[View CSS](./assets/style.css)\n\n![Logo](./assets/logo.png)',
        'assets/style.css': 'body { color: green; }',
        'assets/logo.png': 'fake-png',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify assets exist in built site
      assert(realpath(base.dist, 'assets/style.css'), 'assets/style.css should exist')
      assert(realpath(base.dist, 'assets/logo.png'), 'assets/logo.png should exist')

      // Verify HTML contains transformed absolute paths
      parseHTML(base.dist, 'index.html', ({assertText, assertSelector}) => {
        assertText('body', 'View CSS')
        // Verify the link was transformed to /assets/style.css
        const link = assertSelector('a[href="/assets/style.css"]')
        assertText(link, 'View CSS')
      })
    }))

  it('should copy assets directory with various file types and nested structure', async ({task}) =>
    quarantine(task, async sourcedir => {
      // Create minimal valid 1x1 PNG (transparent)
      const pngData = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home\n\nVarious assets',
        // Nested CSS and icons
        'assets/style.css': 'body { color: red; }',
        'assets/icons/favicon.ico': 'fake-ico',
        // JS and CSS
        'assets/custom.js': 'console.log("test")',
        'assets/theme.css': '.custom { color: blue; }',
        // Various image formats
        'assets/photo.jpg': 'fake-jpg',
        'assets/diagram.svg': '<svg></svg>',
        'assets/icon.webp': 'fake-webp',
        // Nested directory structure
        'assets/data/config.json': '{"test": true}',
        'assets/scripts/helper.js': 'console.log("helper")',
        // Mixed nested assets
        'assets/images/logo.png': pngData,
        'assets/data.json': '{"version": "1.0"}',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify all assets exist in built site (files in assets/ are copied as-is)
      assert(realpath(base.dist, 'assets/style.css'), 'assets/style.css should exist')
      assert(realpath(base.dist, 'assets/icons/favicon.ico'), 'assets/icons/favicon.ico should exist')
      assert(realpath(base.dist, 'assets/custom.js'), 'assets/custom.js should exist')
      assert(realpath(base.dist, 'assets/theme.css'), 'assets/theme.css should exist')
      assert(realpath(base.dist, 'assets/photo.jpg'), 'assets/photo.jpg should exist')
      assert(realpath(base.dist, 'assets/diagram.svg'), 'assets/diagram.svg should exist')
      assert(realpath(base.dist, 'assets/icon.webp'), 'assets/icon.webp should exist')
      assert(realpath(base.dist, 'assets/data/config.json'), 'assets/data/config.json should exist')
      assert(realpath(base.dist, 'assets/scripts/helper.js'), 'assets/scripts/helper.js should exist')
      assert(realpath(base.dist, 'assets/images/logo.png'), 'assets/images/logo.png should exist')
      assert(realpath(base.dist, 'assets/data.json'), 'assets/data.json should exist')

      // Verify file contents preserved in built site
      parseText(base.dist, 'assets/style.css', ({assertContains}) => {
        assertContains('body { color: red; }')
      })
      parseText(base.dist, 'assets/custom.js', ({assertContains}) => {
        assertContains('console.log("test")')
      })
      parseText(base.dist, 'assets/theme.css', ({assertContains}) => {
        assertContains('.custom { color: blue; }')
      })
      parseText(base.dist, 'assets/diagram.svg', ({assertContains}) => {
        assertContains('<svg></svg>')
      })
      parseText(base.dist, 'assets/data/config.json', ({assertContains}) => {
        assertContains('{"test": true}')
      })
      parseText(base.dist, 'assets/data.json', ({assertContains}) => {
        assertContains('{"version": "1.0"}')
      })
    }))
})
