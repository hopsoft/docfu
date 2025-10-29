import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'

const docfuYml = 'site:\n  name: Test'

describe('README Renaming', () => {
  it('should rename README.md to index.md when no index exists', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: Welcome\n---\n\n# Welcome\n\nThis is the README.',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src/content/docs')
      assert(realpath(docsdir, 'index.md'))
      assert.isUndefined(realpath(docsdir, 'README.md'))
      parseMarkdown(docsdir, 'index.md', ({data}) => assert(data.content.includes('This is the README')))
    }))

  it('should keep README.md when index.md exists', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: README\n---\n\n# README\n\nProject readme.',
        'index.md': '---\ntitle: Home\n---\n\n# Home\n\nMain page.',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src/content/docs')
      assert(realpath(docsdir, 'index.md'))
      assert(realpath(docsdir, 'README.md'))
      parseMarkdown(docsdir, 'index.md', ({data}) => assert(data.content.includes('Main page')))
      parseMarkdown(docsdir, 'README.md', ({data}) => assert(data.content.includes('Project readme')))
    }))

  it('should handle case-insensitive README variants', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'readme.md': '---\ntitle: lowercase\n---\n\n# lowercase readme',
        'guides/Readme.md': '---\ntitle: Mixed Case\n---\n\n# Mixed case readme',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src/content/docs')
      assert(realpath(docsdir, 'index.md'))
      assert(realpath(docsdir, 'guides/index.md'))
      assert.isUndefined(realpath(docsdir, 'readme.md'))
      assert.isUndefined(realpath(docsdir, 'guides/Readme.md'))
    }))

  it('should preserve README extension when converting to MDX', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md':
          '---\ntitle: Home\n---\nimport { Card } from "@astrojs/starlight/components"\n\n# Home\n\n<Card title="Test" />\n',
      })

      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const docsdir = realpath(testdir, '.docfu', 'workspace', 'src/content/docs')
      assert(realpath(docsdir, 'index.mdx'))
      assert.isUndefined(realpath(docsdir, 'README.md'))
      assert.isUndefined(realpath(docsdir, 'README.mdx'))
    }))

  describe('README Link Transformation', () => {
    it('should transform README.md links to index.md', async ({task}) =>
      quarantine(task, async testdir => {
        createFixtures(testdir, {
          'docfu.yml': docfuYml,
          'index.md': '---\ntitle: Home\n---\n\nSee [Getting Started](guides/README.md)',
          'guides/README.md': '---\ntitle: Guide\n---\n\n# Guide',
        })

        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

        parseMarkdown(testdir, '.docfu', 'workspace', 'src/content/docs/index.md', ({data}) => {
          assert(data.content.includes('[Getting Started](guides/index.md)'))
          assert(!data.content.includes('README.md'))
        })
      }))

    it('should transform case-insensitive README links', async ({task}) =>
      quarantine(task, async testdir => {
        createFixtures(testdir, {
          'docfu.yml': docfuYml,
          'index.md': `---
title: Home
---

Links:
- [Guide 1](guides/readme.md)
- [Guide 2](api/README.md)
- [Guide 3](docs/Readme.md)`,
          'guides/readme.md': '# Guide 1',
          'api/README.md': '# Guide 2',
          'docs/Readme.md': '# Guide 3',
        })

        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

        parseMarkdown(testdir, '.docfu', 'workspace', 'src/content/docs/index.md', ({data}) => {
          assert(data.content.includes('guides/index.md'))
          assert(data.content.includes('api/index.md'))
          assert(data.content.includes('docs/index.md'))
        })
      }))

    it('should not transform README.md in code blocks', async ({task}) =>
      quarantine(task, async testdir => {
        createFixtures(testdir, {
          'docfu.yml': docfuYml,
          'index.md': `---
title: Home
---

Example link: [README](README.md)

In code:

\`\`\`bash
cat README.md
\`\`\`

Inline \`README.md\` reference.`,
          'README.md': '# Home',
        })

        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

        parseMarkdown(testdir, '.docfu', 'workspace', 'src/content/docs/index.md', ({data}) => {
          assert(data.content.includes('[README](index.md)'))
          assert(data.content.includes('cat README.md'))
          assert(data.content.includes('`README.md`'))
        })
      }))

    it('should transform README links with different extensions', async ({task}) =>
      quarantine(task, async testdir => {
        createFixtures(testdir, {
          'docfu.yml': docfuYml,
          'index.md': `---
title: Home
---

Links:
- [MD Guide](guides/README.md)
- [MDX Guide](api/README.mdx)
- [MDOC Guide](docs/README.mdoc)`,
          'guides/README.md': '# MD',
          'api/README.mdx': '# MDX',
          'docs/README.mdoc': '# MDOC',
        })

        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        parseMarkdown(testdir, '.docfu', 'workspace', 'src/content/docs/index.md', ({data}) => {
          assert(data.content.includes('guides/index.md'))
          assert(data.content.includes('api/index.mdx'))
          assert(data.content.includes('docs/index.mdoc'))
        })
      }))

    it('should transform relative README links', async ({task}) =>
      quarantine(task, async testdir => {
        createFixtures(testdir, {
          'docfu.yml': docfuYml,
          'guides/getting-started.md': `---
title: Getting Started
---

- [Home](../README.md)
- [API](../api/README.md)
- [This section](./README.md)`,
          'README.md': '# Home',
          'api/README.md': '# API',
          'guides/README.md': '# Guide',
        })

        await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
        parseMarkdown(testdir, '.docfu', 'workspace', 'src/content/docs/guides/getting-started.md', ({data}) => {
          assert(data.content.includes('[Home](/)'))
          assert(data.content.includes('[API](/api/)'))
          assert(data.content.includes('[This section](/guides/)'))
        })
      }))
  })
})
