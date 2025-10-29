import {assert, describe, it} from 'vitest'
import {realpath} from '../../lib/file-system.js'
import {createFixtures, spawn, quarantine} from '../utils.js'
import {parseYAML} from '../parsers/yaml.js'

describe('Init Command', () => {
  it('should create docfu.yml with default values', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {'README.md': '# Test'})

      await spawn(`node ./bin/docfu init ${testdir}`)

      parseYAML(testdir, '.docfu', 'docfu.yml', ({data}) => {
        assert.equal(data.site.name, 'Documentation')
        assert.equal(data.site.url, 'https://docs.example.com')
        assert(data.assets)
        assert(data.components)
      })
    }))

  it('should overwrite existing config with --force flag', async ({task}) =>
    quarantine(task, async testdir => {
      createFixtures(testdir, {
        'README.md': '# Test',
        '.docfu/docfu.yml': 'existing: config\nold: value',
      })

      await spawn(`node ./bin/docfu init ${testdir} --force`)

      parseYAML(testdir, '.docfu', 'docfu.yml', ({data}) => {
        assert(data.site)
        assert.isUndefined(data.old)
        assert.isUndefined(data.existing)
      })
    }))
})
