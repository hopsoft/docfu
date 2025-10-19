import {describe, it} from 'vitest'
import assert from 'assert'
import {existsSync, mkdirSync} from 'fs'
import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {execSync} from 'child_process'
import {isolate, createFixtures} from '../utils.js'

describe('Init Command', () => {
  it('should create docfu.yml with default values using --force flag', async () => {
    await isolate(async source => {
      mkdirSync(source, {recursive: true})
      const stdout = execSync(`node ./bin/docfu init ${source}`, {encoding: 'utf-8'})

      assert.ok(stdout.includes('Created'), 'Should show success message')

      const configPath = join(source, 'docfu.yml')
      assert.ok(existsSync(configPath), 'Should create docfu.yml')

      const content = await readFile(configPath, 'utf-8')
      assert.ok(content.includes('site:'), 'Should include site config')
      assert.ok(content.includes('name: Documentation'), 'Should have site name')
      assert.ok(content.includes('url: https://docs.example.com'), 'Should have site URL')
    })
  })

  it('should create docfu.yml from template', async () => {
    await isolate(async source => {
      mkdirSync(source, {recursive: true})
      const stdout = execSync(`node ./bin/docfu init ${source}`, {encoding: 'utf-8'})

      assert.ok(stdout.includes('Created'), 'Should show success message')

      const configPath = join(source, 'docfu.yml')
      const content = await readFile(configPath, 'utf-8')
      assert.ok(content.includes('# DocFu Configuration'), 'Should include config header')
      assert.ok(content.includes('assets:'), 'Should include assets config')
      assert.ok(content.includes('components:'), 'Should include components config')
    })
  })

  it('should overwrite existing config with --force flag', async () => {
    await isolate(async source => {
      const configPath = join(source, 'docfu.yml')

      await createFixtures(source, {
        'docfu.yml': 'existing: config\nold: value',
      })

      const stdout = execSync(`node ./bin/docfu init ${source} --force`, {encoding: 'utf-8'})

      assert.ok(stdout.includes('Created'), 'Should show success message')

      const content = await readFile(configPath, 'utf-8')
      assert.ok(!content.includes('old: value'), 'Should overwrite old config')
      assert.ok(content.includes('site:'), 'Should have new config')
    })
  })

  it('should handle --force flag without prompts', async () => {
    await isolate(async source => {
      mkdirSync(source, {recursive: true})
      execSync(`node ./bin/docfu init ${source}`, {stdio: 'pipe'})

      const configPath = join(source, 'docfu.yml')
      const content = await readFile(configPath, 'utf-8')
      assert.ok(content.includes('site:'), 'Should create config file')
      assert.ok(content.includes('assets:'), 'Should include assets config')
    })
  })

  it('should create config in specified source directory', async () => {
    await isolate(async source => {
      mkdirSync(source, {recursive: true})
      execSync(`node ./bin/docfu init ${source}`, {stdio: 'pipe'})

      const configPath = join(source, 'docfu.yml')
      assert.ok(existsSync(configPath), 'Should create config in source directory')
      const content = await readFile(configPath, 'utf-8')
      assert.ok(content.includes('site:'), 'Should have site config')
    })
  })
})
