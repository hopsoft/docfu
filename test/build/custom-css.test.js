/**
 * Build tests for CSS auto-discovery
 * Tests that CSS files in assets/ are automatically discovered and loaded
 */

import {assert, describe, it} from 'vitest'
import {realpath, write} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import {parseText} from '../parsers/text-parser.js'
import base from '../../lib/base.js'

describe('Custom CSS Auto-Discovery', () => {
  it('should discover and load CSS files from assets directory', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home\n\nContent',
        // Multiple CSS files to test alphabetical ordering
        'assets/brand.css': '.brand { color: red; }',
        'assets/custom.css': '.custom { color: blue; }',
        'assets/theme.css': '.theme { color: green; }',
        // Nested CSS to test structure preservation
        'assets/base.css': '.base { color: black; }',
        'assets/styles/layout.css': '.layout { display: flex; }',
        'assets/styles/components/button.css': '.button { padding: 1rem; }',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify CSS files copied to workspace
      assert(realpath(base.workspace, 'public', 'assets', 'brand.css'), 'Should copy brand.css to workspace')
      assert(realpath(base.workspace, 'public', 'assets', 'custom.css'), 'Should copy custom.css to workspace')
      assert(realpath(base.workspace, 'public', 'assets', 'theme.css'), 'Should copy theme.css to workspace')
      assert(realpath(base.workspace, 'public', 'assets', 'base.css'), 'Should copy base.css to workspace')
      assert(realpath(base.workspace, 'public', 'assets', 'styles', 'layout.css'), 'Should preserve nested structure')
      assert(
        realpath(base.workspace, 'public', 'assets', 'styles', 'components', 'button.css'),
        'Should preserve deeply nested structure'
      )

      // Verify CSS content preserved
      parseText(base.workspace, 'public', 'assets', 'custom.css', ({assertContains}) => {
        assertContains('.custom')
        assertContains('color: blue')
      })

      // Verify manifest includes CSS files
      parseJSON(base.sandbox, 'manifest.json', ({data, assertContainsWhere}) => {
        assert(data.css, 'Manifest should have css section')
        assert.equal(data.css.items.length, 6, 'Should have 6 CSS files')

        // Verify alphabetical ordering at root level (assets/*.css - only one slash)
        const rootCss = data.css.items
          .filter(item => (item.path.match(/\//g) || []).length === 1)
          .sort((a, b) => a.path.localeCompare(b.path))
        assert.equal(rootCss[0].path, 'assets/base.css', 'First root CSS should be base.css')
        assert.equal(rootCss[1].path, 'assets/brand.css', 'Second root CSS should be brand.css')
        assert.equal(rootCss[2].path, 'assets/custom.css', 'Third root CSS should be custom.css')
        assert.equal(rootCss[3].path, 'assets/theme.css', 'Fourth root CSS should be theme.css')

        // Verify nested files preserved
        assertContainsWhere('css.items', {path: 'assets/styles/layout.css'})
        assertContainsWhere('css.items', {path: 'assets/styles/components/button.css'})
      })

      // Verify HTML references CSS
      parseHTML(base.dist, 'index.html', ({assertSelector}) => assertSelector('link[rel="stylesheet"], style'))
    }))
})
