import {describe, it} from 'vitest'
import assert from 'assert'
import {join, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Markdoc Partials', () => {
  it('should convert files with partial tags to .mdoc', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-partial.md': `# Document with Partial

This document includes a partial reference.

{% partial file="_partials/note" /%}

Content continues here.`,
        '_partials/note.md': `This is a simple note partial.

It contains plain markdown content.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/with-partial.mdoc'),
        'File with partial should become .mdoc'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/with-partial.md'),
        undefined,
        'Original .md should not exist'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/with-partial.mdoc'))
      assert.ok(content.includes('{% partial'), 'Should preserve partial tags')
      assert.ok(content.includes('file="_partials/note"'), 'Should preserve extensionless partial reference')
    })
  })

  it('should convert partials with markdoc syntax and update references', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-mdoc-partial.md': `# Document with Markdoc Partial

This document references a partial that contains markdoc syntax.

{% partial file="_partials/markdoc-partial.md" /%}

More content.`,
        '_partials/markdoc-partial.md': `This partial contains markdoc syntax.

{% badge text="Info" /%}

This should trigger conversion to .mdoc format.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/with-mdoc-partial.mdoc'),
        'Main file should be .mdoc'
      )

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/_partials/markdoc-partial.mdoc'),
        'Partial with markdoc should be .mdoc'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/_partials/markdoc-partial.md'),
        undefined,
        'Original partial .md should not exist'
      )

      const main = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/with-mdoc-partial.mdoc'))
      assert.ok(main.includes('file="_partials/markdoc-partial.mdoc"'), 'Reference should be updated to .mdoc')
      assert.ok(!main.includes('file="_partials/markdoc-partial.md"'), 'Should not contain old .md reference')

      const partial = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/_partials/markdoc-partial.mdoc'))
      assert.ok(partial.includes('{% badge'), 'Partial should contain markdoc syntax')
    })
  })

  it('should preserve partials directory structure', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-partial.md': `# Document with Partial

This document includes a partial reference.

{% partial file="_partials/note" /%}

Content continues here.`,
        '_partials/note.md': `This is a simple note partial.

It contains plain markdown content.`,
        '_partials/markdoc-partial.md': `This partial contains markdoc syntax.

{% badge text="Info" /%}

This should trigger conversion to .mdoc format.`,
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/_partials'),
        'Partials directory should exist'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/_partials/note.md'),
        'Plain partial should exist'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/_partials/markdoc-partial.mdoc'),
        'Markdoc partial should exist'
      )
    })
  })
})
