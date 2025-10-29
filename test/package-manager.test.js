import {assert, describe, it, beforeEach, afterEach} from 'vitest'
import {PackageManager, pm} from '../lib/package-manager.js'
import {Pathname} from '../lib/pathname.js'

describe('PackageManager', () => {
  describe('Static properties', () => {
    it('should have frozen lockfiles object', () => {
      assert(Object.isFrozen(PackageManager.lockfiles))
      assert.equal(PackageManager.lockfiles.npm, 'package-lock.json')
      assert.equal(PackageManager.lockfiles.pnpm, 'pnpm-lock.yaml')
      assert.equal(PackageManager.lockfiles.yarn, 'yarn.lock')
      assert.equal(PackageManager.lockfiles.bun, 'bun.lock')
    })

    it('should have frozen commands object', () => {
      assert(Object.isFrozen(PackageManager.commands))
      assert(PackageManager.commands.exec)
      assert(PackageManager.commands.lock)
      assert(PackageManager.commands.pack)
      assert(PackageManager.commands.test)
    })

    it('should have exec commands for all package managers', () => {
      const exec = PackageManager.commands.exec
      assert.equal(exec.bun, 'bunx --no-install')
      assert.equal(exec.npm, 'npx --no-install')
      assert.equal(exec.pnpm, 'pnpm dlx --quiet')
      assert.equal(exec.yarn, 'yarn dlx --quiet')
    })

    it('should have lock commands for all package managers', () => {
      const lock = PackageManager.commands.lock
      assert(lock.bun.includes('bun install'))
      assert(lock.npm.includes('npm install'))
      assert(lock.pnpm.includes('pnpm install'))
      assert(lock.yarn.includes('yarn install'))
    })

    it('should have pack commands for all package managers', () => {
      const pack = PackageManager.commands.pack
      assert(pack.bun.includes('bun'))
      assert(pack.npm.includes('npm pack'))
      assert(pack.pnpm.includes('pnpm pack'))
      assert(pack.yarn.includes('yarn pack'))
    })

    it('should have test commands for all package managers', () => {
      const test = PackageManager.commands.test
      assert(test.bun.includes('vitest'))
      assert(test.npm.includes('vitest'))
      assert(test.pnpm.includes('vitest'))
      assert(test.yarn.includes('vitest'))
    })
  })

  describe('Singleton pattern', () => {
    it('should return same instance from static getter', () => {
      const instance1 = PackageManager.instance
      const instance2 = PackageManager.instance
      assert.equal(instance1, instance2)
    })

    it('should return same instance from constructor', () => {
      const instance1 = new PackageManager()
      const instance2 = new PackageManager()
      assert.equal(instance1, instance2)
    })

    it('should be frozen', () => {
      assert(Object.isFrozen(pm))
    })
  })

  describe('Detection', () => {
    it('should detect a valid package manager', () => {
      const validManagers = ['bun', 'npm', 'pnpm', 'yarn']
      assert(validManagers.includes(pm.name))
    })

    it('should have consistent name property', () => {
      assert.equal(typeof pm.name, 'string')
      assert(pm.name.length > 0)
    })
  })

  describe('Lockfile getters', () => {
    it('should return lockfile name for detected manager', () => {
      const lockfileName = pm.lockfileName
      assert.equal(typeof lockfileName, 'string')
      assert.equal(lockfileName, PackageManager.lockfiles[pm.name])
    })

    it('should return Pathname for lockfilePath', () => {
      const lockfilePath = pm.lockfilePath
      assert(lockfilePath instanceof Pathname)
      assert(lockfilePath.toString().endsWith(pm.lockfileName))
    })

    it('should return boolean for lockfileExists', () => {
      const exists = pm.lockfileExists
      assert.equal(typeof exists, 'boolean')
    })

    it('should return Pathname or undefined for lockfileTemplatePath', () => {
      const templatePath = pm.lockfileTemplatePath
      assert(templatePath === undefined || templatePath instanceof Pathname)
    })
  })

  describe('Lockfile template path with env var', () => {
    let originalEnv

    beforeEach(() => {
      originalEnv = process.env.DOCFU_PM_LOCKFILE
    })

    afterEach(() => {
      if (originalEnv) process.env.DOCFU_PM_LOCKFILE = originalEnv
      else delete process.env.DOCFU_PM_LOCKFILE
    })

    it('should return undefined when env var not set', () => {
      delete process.env.DOCFU_PM_LOCKFILE
      assert.equal(pm.lockfileTemplatePath, undefined)
    })

    it('should return undefined when env var points to non-existent file', () => {
      process.env.DOCFU_PM_LOCKFILE = '/nonexistent/package-lock.json'
      assert.equal(pm.lockfileTemplatePath, undefined)
    })

    it('should return undefined when env var does not match lockfile name', () => {
      process.env.DOCFU_PM_LOCKFILE = '/some/path/wrong-lockfile.json'
      assert.equal(pm.lockfileTemplatePath, undefined)
    })
  })

  describe('Command getters', () => {
    it('should return exec command for detected manager', () => {
      const execCommand = pm.execCommand
      assert.equal(typeof execCommand, 'string')
      assert.equal(execCommand, PackageManager.commands.exec[pm.name])
    })

    it('should return lock command for detected manager', () => {
      const lockCommand = pm.lockCommand
      assert.equal(typeof lockCommand, 'string')
      assert.equal(lockCommand, PackageManager.commands.lock[pm.name])
    })

    it('should return pack command for detected manager', () => {
      const packCommand = pm.packCommand
      assert.equal(typeof packCommand, 'string')
      assert.equal(packCommand, PackageManager.commands.pack[pm.name])
    })

    it('should return test command for detected manager', () => {
      const testCommand = pm.testCommand
      assert.equal(typeof testCommand, 'string')
      assert.equal(testCommand, PackageManager.commands.test[pm.name])
    })
  })

  describe('Custom inspect', () => {
    it('should provide custom inspect output', () => {
      const inspected = pm[Symbol.for('nodejs.util.inspect.custom')]()
      assert(typeof inspected === 'string')
      assert(inspected.includes('PackageManager'))
      assert(inspected.includes('name'))
      assert(inspected.includes(pm.name))
    })

    it('should format as PackageManager { name: "..." }', () => {
      const inspected = pm[Symbol.for('nodejs.util.inspect.custom')]()
      const expected = `PackageManager { name: "${pm.name}" }`
      assert.equal(inspected, expected)
    })
  })

  describe('Consistency checks', () => {
    it('should have matching lockfile name in lockfilePath', () => {
      assert(pm.lockfilePath.toString().endsWith(pm.lockfileName))
    })

    it('should have lockfileExists match actual file system check', () => {
      const exists = pm.lockfileExists
      const pathExists = pm.lockfilePath.exists
      assert.equal(exists, pathExists)
    })

    it('should have command getters return non-empty strings', () => {
      assert(pm.execCommand.length > 0)
      assert(pm.lockCommand.length > 0)
      assert(pm.packCommand.length > 0)
      assert(pm.testCommand.length > 0)
    })
  })
})
