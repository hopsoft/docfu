import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Markdoc Partials', () => {
  it('should convert files with partial tags to .mdoc', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'with-partial.md': `# Document with Partial

This document includes a partial reference.

{% partial file="_partials/note" /%}

Content continues here.`,
        '_partials/note.md': `This is a simple note partial.

It contains plain markdown content.`,
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert.isUndefined(realpath(docsdir, 'with-partial.md'))
      parseMarkdown(docsdir, 'with-partial.mdoc', ({assertTag, data}) => {
        assertTag('partial')
        assert(data.content.includes('file="_partials/note"'))
      })
    }))

  it('should convert partials with markdoc syntax and update references', async ({task}) =>
    quarantine(task, async testdir => {
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

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert.isUndefined(realpath(docsdir, 'with-mdoc-partial.md'))
      parseMarkdown(docsdir, 'with-mdoc-partial.mdoc', ({data}) => {
        assert(data.content.includes('file="_partials/markdoc-partial.mdoc"'))
        assert.isNotOk(data.content.includes('file="_partials/markdoc-partial.md"'))
      })
      assert.isUndefined(realpath(docsdir, '_partials', 'markdoc-partial.md'))
      parseMarkdown(docsdir, '_partials', 'markdoc-partial.mdoc', ({assertTag}) => assertTag('badge'))
    }))

  it('should preserve partials directory structure', async ({task}) =>
    quarantine(task, async testdir => {
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

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src', 'content', 'docs')
      assert(realpath(docsdir, '_partials'))
      assert(realpath(docsdir, '_partials', 'note.md'))
      assert(realpath(docsdir, '_partials', 'markdoc-partial.mdoc'))
    }))
})
