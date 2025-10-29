/**
 * Build tests for content edge cases
 * Tests duplicate slugs, special characters, unusual content patterns
 */

import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import base from '../../lib/base.js'

describe('Content Edge Cases', () => {
  it('should handle various content edge cases and file patterns', async ({task}) =>
    quarantine(task, async sourcedir => {
      const longTitle =
        'This Is A Very Long Title That Goes On And On And On And Contains Many Words To Test Title Handling With Extremely Long Content That Might Need Truncation Or Special Handling In Various Parts Of The System'

      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        // Duplicate slugs in different dirs
        'api/reference.md': '# API Reference\n\nAPI docs',
        'guides/reference.md': '# Guide Reference\n\nGuide docs',
        // Special characters in filenames
        'file-with-dashes.md': '# Dashes\n\nDashes content',
        'file_with_underscores.md': '# Underscores\n\nUnderscores content',
        'file with spaces.md': '# Spaces\n\nSpaces content',
        // Long title
        'long-title.md': `# ${longTitle}\n\nContent here.`,
        // Unicode and emoji
        'unicode.md': '# Unicode Test 🚀\n\nContent with emoji 😀 and unicode: café, naïve, 你好',
        // Mixed HTML and markdown
        'mixed.md': `# Mixed Content

<div class="custom">
This is **markdown** inside HTML.
</div>

Regular markdown here.

<span style="color: red;">Inline HTML</span> with *markdown*.`,
        // README renaming
        'README.md': '# Project README\n\nMain readme',
        'docs/README.md': '# Docs README\n\nDocs intro',
        // Deep nesting
        'a/b/c/d/e/deep.md': '# Deep File\n\nDeeply nested',
        // Empty heading
        'empty-heading.md': '# \n\nContent after empty heading.\n\n## Another Section',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // Verify duplicate slugs in different dirs
      parseHTML(base.dist, 'api', 'reference', 'index.html', ({assertText}) => {
        assertText('main', 'API Reference')
        assertText('main', 'API docs')
      })
      parseHTML(base.dist, 'guides', 'reference', 'index.html', ({assertText}) => assertText('main', 'Guide Reference'))

      // Verify special characters in filenames
      assert(realpath(base.dist, 'file-with-dashes', 'index.html'), 'Should build files with dashes')
      assert(realpath(base.dist, 'file_with_underscores', 'index.html'), 'Should build files with underscores')
      assert(realpath(base.dist, 'file-with-spaces', 'index.html'), 'Should normalize spaces to dashes')

      // Verify long title
      parseJSON(base.sandbox, 'manifest.json', ({assertContainsWhere}) => {
        assertContainsWhere('docs', {slug: 'long-title'})
      })
      parseHTML(base.dist, 'long-title', 'index.html', ({assertText}) => assertText('h1', longTitle))

      // Verify unicode and emoji
      parseHTML(base.dist, 'unicode', 'index.html', ({assertText}) => {
        assertText('main', '😀')
        assertText('main', 'café')
        assertText('main', '你好')
      })

      // Verify mixed HTML and markdown
      parseHTML(base.dist, 'mixed', 'index.html', ({assertSelector, assertText}) => {
        assertSelector('.custom')
        assertText('.custom', 'markdown')
        assertSelector('span[style*="color"]')
      })

      // Verify README renaming
      parseHTML(base.dist, 'index.html', ({assertText}) => assertText('h1', 'Project README'))
      parseHTML(base.dist, 'docs', 'index.html', ({assertText}) => assertText('h1', 'Docs README'))

      // Verify deep nesting
      assert(realpath(base.dist, 'a', 'b', 'c', 'd', 'e', 'deep', 'index.html'), 'Should preserve deep nesting')
      parseHTML(base.dist, 'a', 'b', 'c', 'd', 'e', 'deep', 'index.html', ({assertText}) =>
        assertText('h1', 'Deep File')
      )

      // Verify empty heading
      parseHTML(base.dist, 'empty-heading', 'index.html', ({assertText}) => {
        assertText('main', 'Content after empty heading')
        assertText('main', 'Another Section')
      })
    }))

  it('should handle case-sensitive filenames', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'Guide.md': '# Guide (capitalized)\n\nCapitalized content',
        'guide.md': '# guide (lowercase)\n\nLowercase content',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      // On case-insensitive filesystems (macOS, Windows), both files map to same slug
      // On case-sensitive filesystems (Linux), they're separate files
      const hasGuide = realpath(base.dist, 'guide', 'index.html')
      const hasCapitalGuide = realpath(base.dist, 'Guide', 'index.html')

      assert(hasGuide || hasCapitalGuide, 'Should build at least one version')

      // Just verify one was built - content will depend on which file "won" on case-insensitive FS
      if (hasGuide) {
        parseHTML(base.dist, 'guide', 'index.html', ({assertText}) => assertText('main', /content/i))
      } else {
        parseHTML(base.dist, 'Guide', 'index.html', ({assertText}) => assertText('main', /content/i))
      }
    }))

  it('should ignore files with no extension', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
        LICENSE: 'MIT License text',
        CHANGELOG: '# Changelog\n\nVersion 1.0',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      parseJSON(base.sandbox, 'manifest.json', ({assertLength, assertContainsWhere}) => {
        // Only index.md should be processed
        assertLength('docs', 1)
        assertContainsWhere('docs', {slug: 'index'})
      })

      parseHTML(base.dist, 'index.html', ({assertText}) => assertText('h1', 'Home'))
    }))
})
