import {assert, describe, it} from 'vitest'
import {join, mkdir, read, realpath, rm, write} from '../../lib/file-system.js'
import {createFixtures, quarantine, runCLI} from '../utils.js'
import {parseMarkdown} from '../parsers/markdown-parser.js'
import {parseMDX} from '../parsers/mdx-parser.js'
import {parseJSON} from '../parsers/json-parser.js'
import stage from '../../lib/cli/stage.js'

describe('Stage Cleanup', () => {
  it('should clean workspace on subsequent stage', async ({task}) =>
    quarantine(task, async source => {
      createFixtures(source, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home\n\nContent',
      })

      const {workspaceDocs} = await runCLI(task, 'stage', source)
      const index = workspaceDocs.join('index.md')
      const stale = workspaceDocs.join('stale-file.md')
      stale.write('# Stale\n\nThis should be removed next run')
      assert(index.exists, `Should exist: ${index}`)
      assert(stale.exists, `Should exist: ${stale}`)

      await runCLI(task, 'stage', source)
      assert(index.exists, `Should exist: ${index}`)
      assert(!stale.exists, `Should not exist: ${stale}`)
    }))

  // it('should handle removed source files', async ({task}) =>
  //   quarantine(task, async sourcedir => {
  //     createFixtures(sourcedir, {
  //       'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
  //       'index.md': '# Home',
  //       'removed.md': '# To Remove',
  //     })
  //
  //     await stage(sourcedir, {unsafe: true})
  //     // await spawn(`node ./bin/docfu stage --unsafe ${sourcedir}`)
  //     base.source = sourcedir
  //     assert(realpath(base.workspace, 'src/content/docs/removed.md'), 'Should create removed.md')
  //     rm(realpath(sourcedir, 'removed.md'))
  //     assert.isUndefined(realpath(base.workspace, 'removed.md'), 'Should delete removed.md')
  //
  //     await stage(sourcedir, {unsafe: true})
  //     base.source = sourcedir
  //     assert(realpath(base.workspace, 'src/content/docs/index.md'), 'Should keep remaining files')
  //     assert.isUndefined(
  //       realpath(base.workspace, 'src/content/docs/removed.md'),
  //       'Should remove file that was deleted from source'
  //     )
  //   }))
  //
  // it('should be idempotent (same input produces same output)', async ({task}) =>
  //   quarantine(task, async sourcedir => {
  //     createFixtures(sourcedir, {
  //       'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
  //       'index.md': '# Home\n\nContent here',
  //       'guide.md': '# Guide\n\n<Card title="Test">Content</Card>',
  //     })
  //
  //     await runCLI('stage', sourcedir)
  //     const firstIndex = read(base.workspace, 'src/content/docs/index.md')
  //     const firstGuide = read(base.workspace, 'src/content/docs/guide.mdx')
  //     const firstManifest = read(base.sandbox, 'manifest.json')
  //
  //     await runCLI('stage', sourcedir)
  //     assert.equal(firstIndex, read(base.workspace, 'src/content/docs/index.md'))
  //     assert.equal(firstGuide, read(base.workspace, 'src/content/docs/guide.mdx'))
  //     assert.equal(firstManifest, read(base.sandbox, 'manifest.json'))
  //   }))
  //
  // it('should handle format changes (md -> mdx)', async ({task}) =>
  //   quarantine(task, async sourcedir => {
  //     createFixtures(sourcedir, {
  //       'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
  //       'page.md': '# Page\n\nPlain content',
  //     })
  //
  //     await stage(sourcedir, {unsafe: true})
  //     base.source = sourcedir
  //     assert(realpath(base.workspace, 'src/content/docs/page.md'), 'Should create .md file')
  //
  //     write(join(sourcedir, 'page.md'), '# Page\n\n<Card title="Test">With component</Card>')
  //     await stage(sourcedir, {unsafe: true})
  //     base.source = sourcedir
  //     assert(realpath(base.workspace, 'src/content/docs/page.mdx'), 'Should create .mdx file')
  //     assert.isUndefined(realpath(base.workspace, 'src/content/docs/page.md'), 'Should remove old .md file')
  //   }))
  //
  // it('should handle workspace directory already existing', async ({task}) =>
  //   quarantine(task, async sourcedir => {
  //     createFixtures(sourcedir, {
  //       'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
  //       'index.md': '# Home',
  //     })
  //
  //     base.source = sourcedir
  //     mkdir(base.workspace, 'src/content/docs')
  //     write(join(base.workspace, 'old-file.txt'), 'old content')
  //     write(join(base.workspace, 'src/content/docs/another.md'), '# Old')
  //
  //     await stage(sourcedir, {unsafe: true})
  //     base.source = sourcedir
  //
  //     assert.isUndefined(realpath(base.workspace, 'old-file.txt'), 'Should clean existing workspace')
  //     assert.isUndefined(realpath(base.workspace, 'src/content/docs/another.md'), 'Should remove all old files')
  //     assert(realpath(base.workspace, 'src/content/docs/index.md'), 'Should create new files')
  //   }))
  //
  // it('should preserve workspace structure for nested files', async ({task}) =>
  //   quarantine(task, async sourcedir => {
  //     mkdir(sourcedir, 'guides', 'advanced')
  //     createFixtures(sourcedir, {
  //       'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
  //       'index.md': '# Home',
  //       'guides/intro.md': '# Intro',
  //       'guides/advanced/tips.md': '# Tips',
  //     })
  //
  //     await stage(sourcedir, {unsafe: true})
  //     base.source = sourcedir
  //
  //     assert(realpath(base.workspace, 'src/content/docs/guides', 'intro.md'), 'Should preserve nested structure')
  //     assert(realpath(base.workspace, 'src/content/docs/guides', 'advanced', 'tips.md'), 'Should preserve deep nesting')
  //   }))
})
