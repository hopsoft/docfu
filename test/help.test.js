import {describe, it} from 'vitest'
import assert from 'assert'
import {execSync} from 'child_process'

describe('CLI Help Messages', () => {
  it('should show main help with --help flag', () => {
    const stdout = execSync('node ./bin/docfu --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('Generate production-ready documentation websites'), 'Should show main description')
    assert.ok(stdout.includes('Commands:'), 'Should list commands')
    assert.ok(stdout.includes('init'), 'Should list init command')
    assert.ok(stdout.includes('stage'), 'Should list stage command')
    assert.ok(stdout.includes('build'), 'Should list build command')
    assert.ok(stdout.includes('preview'), 'Should list preview command')
    assert.ok(stdout.includes('Examples:'), 'Should show examples')
    assert.ok(stdout.includes('Environment Variables:'), 'Should show environment variables')
  })

  it('should show version with --version flag', () => {
    const stdout = execSync('node ./bin/docfu --version', {encoding: 'utf-8'})

    assert.ok(/\d+\.\d+\.\d+/.test(stdout), 'Should show semver version number')
  })

  it('should show version with -v flag', () => {
    const stdout = execSync('node ./bin/docfu -v', {encoding: 'utf-8'})

    assert.ok(/\d+\.\d+\.\d+/.test(stdout), 'Should show semver version number')
  })

  it('should show init command help', () => {
    const stdout = execSync('node ./bin/docfu init --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('Initialize DocFu configuration'), 'Should show init description')
    assert.ok(stdout.includes('--force'), 'Should mention force option')
    assert.ok(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert.ok(stdout.includes('overwrite existing configuration'), 'Should explain force flag')
  })

  it('should show stage command help', () => {
    const stdout = execSync('node ./bin/docfu stage --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('Stage documents for build'), 'Should show stage description')
    assert.ok(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert.ok(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })

  it('should show build command help', () => {
    const stdout = execSync('node ./bin/docfu build --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('Build documentation site'), 'Should show build description')
    assert.ok(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert.ok(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })

  it('should show preview command help', () => {
    const stdout = execSync('node ./bin/docfu preview --help', {encoding: 'utf-8'})

    assert.ok(stdout.includes('Preview documentation site'), 'Should show preview description')
    assert.ok(stdout.includes('--port'), 'Should mention port option')
    assert.ok(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert.ok(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })
})
