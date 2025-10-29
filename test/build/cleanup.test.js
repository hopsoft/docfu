import {assert, describe, it} from 'vitest'
import {Pathname} from '../../lib/pathname.js'
import {createFixtures, quarantine, spawn} from '../utils.js'
import {DocFuConfig} from '../../lib/docfu-config.js'

describe('Build Cleanup', () => {
  it('should clean dist directory on full build', async ({task}) =>
    quarantine(task, async sourcedir => {
      createFixtures(sourcedir, {
        'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
        'index.md': '# Home',
      })

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)

      const docfu = DocFuConfig(sourcedir)
      const stalePage = docfu.sandbox.dist.directory.join('stale-page.html')
      stalePage.write('<html>stale</html>')
      assert(stalePage.exists, 'Should have created stale-page.html')

      await spawn(`node ./bin/docfu build --unsafe ${sourcedir}`)

      const indexPage = docfu.sandbox.dist.directory.join('index.html')
      assert(indexPage.exists, 'Should have index.html')
      assert.isFalse(stalePage.exists, 'Should not include stale-page.html')
    }))
})
