import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

const docfuYml = 'site:\n  name: Test'

describe('README Renaming', () => {
  it('should rename README.md to index.md when no index exists', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: Welcome\n---\n\n# Welcome\n\nThis is the README.',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'README.md should become index.md')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/README.md')), 'README.md should not exist')

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('This is the README'), 'Content should be preserved')
    })
  })

  it('should keep README.md when index.md exists', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'README.md': '---\ntitle: README\n---\n\n# README\n\nProject readme.',
        'index.md': '---\ntitle: Home\n---\n\n# Home\n\nMain page.',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'index.md should exist')
      assert.ok(existsSync(join(workspace, 'src/content/docs/README.md')), 'README.md should also exist')

      const index = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      const readme = await readFile(join(workspace, 'src/content/docs/README.md'), 'utf-8')
      assert.ok(index.includes('Main page'), 'index.md should have correct content')
      assert.ok(readme.includes('Project readme'), 'README.md should have correct content')
    })
  })

  it('should handle case-insensitive README variants', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'readme.md': '---\ntitle: lowercase\n---\n\n# lowercase readme',
        'guides/Readme.md': '---\ntitle: Mixed Case\n---\n\n# Mixed case readme',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.md')), 'readme.md should become index.md')
      assert.ok(existsSync(join(workspace, 'src/content/docs/guides/index.md')), 'Readme.md should become index.md')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/readme.md')), 'readme.md should not exist')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/guides/Readme.md')), 'Readme.md should not exist')
    })
  })

  it('should preserve README extension when converting to MDX', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'README.md':
          '---\ntitle: Home\n---\nimport { Card } from "@astrojs/starlight/components"\n\n# Home\n\n<Card title="Test" />\n',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      assert.ok(existsSync(join(workspace, 'src/content/docs/index.mdx')), 'Should become index.mdx due to JSX')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/README.md')), 'README.md should not exist')
      assert.ok(!existsSync(join(workspace, 'src/content/docs/README.mdx')), 'README.mdx should not exist')
    })
  })
})

describe('README Link Transformation', () => {
  it('should transform README.md links to index.md', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
        'docfu.yml': docfuYml,
        'index.md': '---\ntitle: Home\n---\n\nSee [Getting Started](guides/README.md)',
        'guides/README.md': '---\ntitle: Guide\n---\n\n# Guide',
      })

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('[Getting Started](guides/index.md)'), 'Should transform README.md to index.md')
      assert.ok(!content.includes('README.md'), 'Should not contain README.md references')
    })
  })

  it('should transform case-insensitive README links', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('guides/index.md'), 'Should transform readme.md')
      assert.ok(content.includes('api/index.md'), 'Should transform README.md')
      assert.ok(content.includes('docs/index.md'), 'Should transform Readme.md')
    })
  })

  it('should not transform README.md in code blocks', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('[README](index.md)'), 'Should transform markdown link')
      assert.ok(content.includes('cat README.md'), 'Should preserve README.md in code block')
      assert.ok(content.includes('`README.md`'), 'Should preserve inline code')
    })
  })

  it('should transform README links with different extensions', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const content = await readFile(join(workspace, 'src/content/docs/index.md'), 'utf-8')
      assert.ok(content.includes('guides/index.md'), 'Should transform README.md')
      assert.ok(content.includes('api/index.mdx'), 'Should transform README.mdx')
      assert.ok(content.includes('docs/index.mdoc'), 'Should transform README.mdoc')
    })
  })

  it('should transform relative README links', async () => {
    await isolate(async source => {
      const root = join(dirname(source), 'root')
      const workspace = join(root, 'workspace')

      await createFixtures(source, {
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

      execSync(`node ./bin/docfu stage ${source} --sandbox ${root} --unsafe`, {stdio: 'pipe'})

      const content = await readFile(join(workspace, 'src/content/docs/guides/getting-started.md'), 'utf-8')
      assert.ok(content.includes('[Home](/)'), 'Should transform ../README.md to root')
      assert.ok(content.includes('[API](/api/)'), 'Should transform ../api/README.md to /api/')
      assert.ok(content.includes('[This section](/guides/)'), 'Should transform ./README.md to /guides/')
    })
  })
})
