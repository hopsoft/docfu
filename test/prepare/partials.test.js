import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

const docfuYml = 'site:\n  name: Test Docs\n  url: https://test.example.com'

describe('Markdoc Partials', () => {
  it('should convert files with partial tags to .mdoc', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'with-partial.md': `# Document with Partial

This document includes a partial reference.

{% partial file="_partials/note" /%}

Content continues here.`,
        '_partials/note.md': `This is a simple note partial.

It contains plain markdown content.`,
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(
        existsSync(join(workspace, 'src/content/docs/with-partial.mdoc')),
        'File with partial should become .mdoc'
      )
      assert.ok(!existsSync(join(workspace, 'src/content/docs/with-partial.md')), 'Original .md should not exist')

      const content = await readFile(join(workspace, 'src/content/docs/with-partial.mdoc'), 'utf-8')
      assert.ok(content.includes('{% partial'), 'Should preserve partial tags')
      assert.ok(content.includes('file="_partials/note"'), 'Should preserve extensionless partial reference')
    })
  })

  it('should convert partials with markdoc syntax and update references', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'with-mdoc-partial.md': `# Document with Markdoc Partial

This document references a partial that contains markdoc syntax.

{% partial file="_partials/markdoc-partial.md" /%}

More content.`,
        '_partials/markdoc-partial.md': `This partial contains markdoc syntax.

{% badge text="Info" /%}

This should trigger conversion to .mdoc format.`,
      })

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/with-mdoc-partial.mdoc')), 'Main file should be .mdoc')

      assert.ok(
        existsSync(join(workspace, 'src/content/docs/_partials/markdoc-partial.mdoc')),
        'Partial with markdoc should be .mdoc'
      )
      assert.ok(
        !existsSync(join(workspace, 'src/content/docs/_partials/markdoc-partial.md')),
        'Original partial .md should not exist'
      )

      const main = await readFile(join(workspace, 'src/content/docs/with-mdoc-partial.mdoc'), 'utf-8')
      assert.ok(main.includes('file="_partials/markdoc-partial.mdoc"'), 'Reference should be updated to .mdoc')
      assert.ok(!main.includes('file="_partials/markdoc-partial.md"'), 'Should not contain old .md reference')

      const partial = await readFile(join(workspace, 'src/content/docs/_partials/markdoc-partial.mdoc'), 'utf-8')
      assert.ok(partial.includes('{% badge'), 'Partial should contain markdoc syntax')
    })
  })

  it('should preserve partials directory structure', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu prepare ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/_partials')), 'Partials directory should exist')
      assert.ok(existsSync(join(workspace, 'src/content/docs/_partials/note.md')), 'Plain partial should exist')
      assert.ok(
        existsSync(join(workspace, 'src/content/docs/_partials/markdoc-partial.mdoc')),
        'Markdoc partial should exist'
      )
    })
  })
})

describe('MDX Partials', () => {
  it('should support importing and rendering MDX files as partials', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const dist = join(root, 'dist')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        '_partials/reusable-content.mdx': `---
title: Reusable Content
---

This is reusable content from a partial MDX file.

It can include **markdown** formatting and even components!`,
        '_partials/license.mdx': `## License

MIT License - Feel free to use this content.`,
        'guide.mdx': `---
title: Guide
---

import ReusableContent from './_partials/reusable-content.mdx'
import License from './_partials/license.mdx'

# Documentation Guide

Here's some shared content:

<ReusableContent />

And the license:

<License />`,
      })

      execSync(`node ./bin/docfu build ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      // Verify HTML output includes content from both partials
      const html = await readFile(join(dist, 'guide/index.html'), 'utf-8')
      assert.ok(html.includes('This is reusable content from a partial MDX file'), 'Should render partial content')
      assert.ok(html.includes('markdown'), 'Should render markdown formatting from partial')
      assert.ok(html.includes('MIT License'), 'Should render license partial content')
      assert.ok(html.includes('Feel free to use this content'), 'Should render full partial text')
    })
  })

  it('should support MDX partials with nested imports', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const dist = join(root, 'dist')

      await createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        '_partials/footer.mdx': `Built with DocFu`,
        '_partials/section.mdx': `import Footer from './footer.mdx'

## Section Content

This is a reusable section.

<Footer />`,
        'page.mdx': `---
title: Page
---

import Section from './_partials/section.mdx'

# My Page

<Section />`,
      })

      execSync(`node ./bin/docfu build ${source} --root ${root} --unsafe`, {stdio: 'pipe'})

      const html = await readFile(join(dist, 'page/index.html'), 'utf-8')
      assert.ok(html.includes('This is a reusable section'), 'Should render section partial')
      assert.ok(html.includes('Built with DocFu'), 'Should render nested footer partial')
    })
  })
})
