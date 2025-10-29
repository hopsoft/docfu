import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {parseHTML} from '../parsers/html-parser.js'
import base from '../../lib/base.js'

describe('Theme Configuration', () => {
  it('should build with nova theme when configured', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Theme Nova Test\n  url: https://test.example.com\n  theme: nova',
        'index.md': '# Home\n\nTesting Nova theme configuration.',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      assert(realpath(base.dist, 'index.html'), 'Should generate index.html')

      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('main', 'Testing Nova theme')
      })
    }))

  it('should build with starlight default theme when configured', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Theme Starlight Test\n  url: https://test.example.com\n  theme: starlight',
        'index.md': '# Home\n\nTesting Starlight default theme configuration.',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      assert(realpath(base.dist, 'index.html'), 'Should generate index.html')

      parseHTML(base.dist, 'index.html', ({assertText}) => {
        assertText('main', 'Testing Starlight default theme')
      })
    }))

  it('should default to nova theme when no theme specified', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)
      base.source = sourcedir

      assert(realpath(base.dist, 'index.html'), 'Should generate index.html')
    }))
})
