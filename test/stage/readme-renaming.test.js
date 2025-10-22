import {describe, it} from 'vitest'
import assert from 'assert'
import {join, read, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'

const docfuYml = 'site:\n  name: Test'

describe('README Renaming', () => {
  it('should rename README.md to index.md when no index exists', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: Welcome\n---\n\n# Welcome\n\nThis is the README.',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'),
        'README.md should become index.md'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/README.md'),
        undefined,
        'README.md should not exist'
      )

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      assert.ok(content.includes('This is the README'), 'Content should be preserved')
    })
  })

  it('should keep README.md when index.md exists', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: README\n---\n\n# README\n\nProject readme.',
        'index.md': '---\ntitle: Home\n---\n\n# Home\n\nMain page.',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'), 'index.md should exist')
      assert.ok(realpath(testdir, '.docfu', 'workspace', 'src/content/docs/README.md'), 'README.md should also exist')

      const index = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      const readme = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/README.md'))
      assert.ok(index.includes('Main page'), 'index.md should have correct content')
      assert.ok(readme.includes('Project readme'), 'README.md should have correct content')
    })
  })

  it('should handle case-insensitive README variants', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'readme.md': '---\ntitle: lowercase\n---\n\n# lowercase readme',
        'guides/Readme.md': '---\ntitle: Mixed Case\n---\n\n# Mixed case readme',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'),
        'readme.md should become index.md'
      )
      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/guides/index.md'),
        'Readme.md should become index.md'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/readme.md'),
        undefined,
        'readme.md should not exist'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/guides/Readme.md'),
        undefined,
        'Readme.md should not exist'
      )
    })
  })

  it('should preserve README extension when converting to MDX', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'README.md':
          '---\ntitle: Home\n---\nimport { Card } from "@astrojs/starlight/components"\n\n# Home\n\n<Card title="Test" />\n',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/index.mdx'),
        'Should become index.mdx due to JSX'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/README.md'),
        undefined,
        'README.md should not exist'
      )
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'src/content/docs/README.mdx'),
        undefined,
        'README.mdx should not exist'
      )
    })
  })
})

describe('README Link Transformation', () => {
  it('should transform README.md links to index.md', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home\n---\n\nSee [Getting Started](guides/README.md)',
        'guides/README.md': '---\ntitle: Guide\n---\n\n# Guide',
      })

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      assert.ok(content.includes('[Getting Started](guides/index.md)'), 'Should transform README.md to index.md')
      assert.ok(!content.includes('README.md'), 'Should not contain README.md references')
    })
  })

  it('should transform case-insensitive README links', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      assert.ok(content.includes('guides/index.md'), 'Should transform readme.md')
      assert.ok(content.includes('api/index.md'), 'Should transform README.md')
      assert.ok(content.includes('docs/index.md'), 'Should transform Readme.md')
    })
  })

  it('should not transform README.md in code blocks', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      assert.ok(content.includes('[README](index.md)'), 'Should transform markdown link')
      assert.ok(content.includes('cat README.md'), 'Should preserve README.md in code block')
      assert.ok(content.includes('`README.md`'), 'Should preserve inline code')
    })
  })

  it('should transform README links with different extensions', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/index.md'))
      assert.ok(content.includes('guides/index.md'), 'Should transform README.md')
      assert.ok(content.includes('api/index.mdx'), 'Should transform README.mdx')
      assert.ok(content.includes('docs/index.mdoc'), 'Should transform README.mdoc')
    })
  })

  it('should transform relative README links', ({task}) => {
    quarantine(task, testdir => {
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

      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      const content = read(join(testdir, '.docfu', 'workspace', 'src/content/docs/guides/getting-started.md'))
      assert.ok(content.includes('[Home](/)'), 'Should transform ../README.md to root')
      assert.ok(content.includes('[API](/api/)'), 'Should transform ../api/README.md to /api/')
      assert.ok(content.includes('[This section](/guides/)'), 'Should transform ./README.md to /guides/')
    })
  })
})
