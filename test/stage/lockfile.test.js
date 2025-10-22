import {describe, it} from 'vitest'
import assert from 'assert'
import {basename, join, realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import pkgmgr from '../../lib/package-manager.js'

describe('Lockfile Generation', () => {
  it('should generate package.json and lockfile without installing node_modules', ({task}) => {
    quarantine(task, testdir => {
      createFixtures(testdir, {'index.md': '# Home'})
      spawn(`node ./bin/docfu stage --unsafe ${testdir}`)

      assert.ok(realpath(testdir, '.docfu', 'workspace', 'package.json'), 'Should create package.json in workspace')
      assert.ok(realpath(testdir, '.docfu', 'workspace', pkgmgr.lockfile), 'Should create lockfile in workspace')
      assert.strictEqual(
        realpath(testdir, '.docfu', 'workspace', 'node_modules'),
        undefined,
        'Should NOT create node_modules directory (lockfile-only generation)'
      )
    })
  })
})
