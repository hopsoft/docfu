import {describe, it} from 'vitest'
import assert from 'assert'
import {execSync} from 'child_process'

describe('Preview Command', () => {
  it('should show usage information', async () => {
    const stdout = execSync('node ./bin/docfu preview --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('preview'), 'Should show preview command')
    assert.ok(stdout.includes('port'), 'Should mention port option')
  })
})
