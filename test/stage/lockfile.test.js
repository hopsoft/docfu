import {assert, describe, it} from 'vitest'
import {basename, join, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {pm} from '../../lib/package-manager.js'

describe('Lockfile Generation', () => {
  it('should generate package.json and lockfile without installing node_modules', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {'index.md': '# Home'})
      await spawn(`node ./bin/docfu stage --unsafe ${testdir}`)
      assert(realpath(testdir, '.docfu', 'workspace', 'package.json'))
      assert(realpath(testdir, '.docfu', 'workspace', pm.lockfileName))
      assert.isUndefined(realpath(testdir, '.docfu', 'workspace', 'node_modules'))
    }))
})
