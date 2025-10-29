import {assert, describe, it} from 'vitest'
import {execSync} from 'child_process'

describe('CLI Help Messages', () => {
  it('should show main help with --help flag', () => {
    const stdout = execSync('node ./bin/docfu --help', {encoding: 'utf-8'})

    assert(stdout.includes('Generate production-ready documentation websites'), 'Should show main description')
    assert(stdout.includes('Commands:'), 'Should list commands')
    assert(stdout.includes('init'), 'Should list init command')
    assert(stdout.includes('stage'), 'Should list stage command')
    assert(stdout.includes('build'), 'Should list build command')
    assert(stdout.includes('preview'), 'Should list preview command')
    assert(stdout.includes('Examples:'), 'Should show examples')
    assert(stdout.includes('Environment Variables:'), 'Should show environment variables')
  })

  it('should show version with --version flag', () => {
    const stdout = execSync('node ./bin/docfu --version', {encoding: 'utf-8'})

    assert(/\d+\.\d+\.\d+/.test(stdout), 'Should show semver version number')
  })

  it('should show version with -v flag', () => {
    const stdout = execSync('node ./bin/docfu -v', {encoding: 'utf-8'})

    assert(/\d+\.\d+\.\d+/.test(stdout), 'Should show semver version number')
  })

  it('should show init command help', () => {
    const stdout = execSync('node ./bin/docfu init --help', {encoding: 'utf-8'})

    assert(stdout.includes('Initialize DocFu configuration'), 'Should show init description')
    assert(stdout.includes('--force'), 'Should mention force option')
    assert(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert(stdout.includes('overwrite existing configuration'), 'Should explain force flag')
  })

  it('should show stage command help', () => {
    const stdout = execSync('node ./bin/docfu stage --help', {encoding: 'utf-8'})

    assert(stdout.includes('Stage documents for build'), 'Should show stage description')
    assert(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })

  it('should show build command help', () => {
    const stdout = execSync('node ./bin/docfu build --help', {encoding: 'utf-8'})

    assert(stdout.includes('Build documentation site'), 'Should show build description')
    assert(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })

  it('should show preview command help', () => {
    const stdout = execSync('node ./bin/docfu preview --help', {encoding: 'utf-8'})

    assert(stdout.includes('Preview documentation site'), 'Should show preview description')
    assert(stdout.includes('--port'), 'Should mention port option')
    assert(stdout.includes('--sandbox'), 'Should mention sandbox option')
    assert(stdout.includes('--unsafe'), 'Should mention unsafe option')
  })
})
