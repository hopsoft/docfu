import {exec} from 'child_process'
import './logger.js'
import {Pathname} from './pathname.js'
import {publish as pub} from './event-bus.js'
import {xv} from './vargs.js'

class PackageManager {
  static lockfiles = Object.freeze({
    npm: 'package-lock.json',
    pnpm: 'pnpm-lock.yaml',
    yarn: 'yarn.lock',
    bun: 'bun.lock',
  })

  static commands = Object.freeze({
    exec: {
      bun: 'bunx --no-install',
      npm: 'npx --no-install',
      pnpm: 'pnpm dlx --quiet',
      yarn: 'yarn dlx --quiet',
    },

    lock: {
      bun: 'bun install --lockfile-only --no-progress',
      npm: 'npm install --package-lock-only --no-audit --no-fund --prefer-offline --loglevel=error',
      pnpm: 'pnpm install --lockfile-only --prefer-offline --silent',
      yarn: 'yarn install --mode update-lockfile --silent',
    },

    pack: {
      bun: 'bun pm pack --no-progress',
      npm: 'npm pack --quiet',
      pnpm: 'pnpm pack --silent',
      yarn: 'yarn pack --quiet',
    },

    test: {
      bun: `bunx --no-install vitest run`,
      npm: `npx --no-install vitest run`,
      pnpm: `pnpm dlx vitest run`,
      yarn: `yarn dlx vitest run`,
    },
  })

  /**
   * Gets the singleton PackageManager instance
   * @returns {PackageManager}
   */
  static get instance() {
    return this.#instance || new PackageManager()
  }

  constructor() {
    if (PackageManager.#instance) return PackageManager.#instance

    this.#executable = String(process.argv[0]).toLowerCase()
    this.#userAgent = String(process.env.npm_config_user_agent || '').toLowerCase()

    if (this.#check('bunx') || this.#check('bun')) this.#name = 'bun'
    else if (this.#check('npx') || this.#check('npm')) this.#name = 'npm'
    else if (this.#check('pnpmx') || this.#check('pnpm')) this.#name = 'pnpm'
    else if (this.#check('yarn')) this.#name = 'yarn'
    else this.#name = 'npm'

    PackageManager.#instance = Object.freeze(this)
  }

  /**
   * Gets the active package manager name
   * @returns {string} Package manager (bun, npm, pnpm, yarn)
   */
  get name() {
    return this.#name
  }

  /**
   * Get lockfile name for active package manager
   * @returns {string} Lockfile filename
   */
  get lockfileName() {
    return PackageManager.lockfiles[this.name]
  }

  get lockfilePath() {
    return new Pathname(process.cwd(), this.lockfileName)
  }

  get lockfileExists() {
    return this.lockfilePath.exists
  }

  get lockfileTemplatePath() {
    if (process.env.DOCFU_PM_LOCKFILE?.endsWith(PackageManager.lockfiles[this.name])) {
      const path = new Pathname(process.env.DOCFU_PM_LOCKFILE)
      if (path.exists) return path
    }
  }

  /**
   * Get exec command prefix for active package manager
   * @returns {string} Command prefix (e.g., 'npx --no-install')
   */
  get execCommand() {
    return PackageManager.commands.exec[this.name]
  }

  /**
   * Get lock command for active package manager
   * @returns {string} Full lockfile generation command
   */
  get lockCommand() {
    return PackageManager.commands.lock[this.name]
  }

  /**
   * Get pack command for active package manager
   * @returns {string} Full pack command
   */
  get packCommand() {
    return PackageManager.commands.pack[this.name]
  }

  /**
   * Get test command prefix for active package manager
   * @returns {string} Command prefix (e.g., 'npx vitest run')
   */
  get testCommand() {
    return PackageManager.commands.test[this.name]
  }

  /**
   * Run package manager exec command with tool and arguments
   * @param {...string} args - Tool name and arguments
   * @param {Object} [options] - child_process.exec options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  run(...vargs) {
    return this.#exec('exec', ...vargs)
  }

  /**
   * Generate lockfile for active package manager
   * @param {Object} [options] - child_process.exec options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  lock(...vargs) {
    return this.#exec('lock', ...vargs)
  }

  /**
   * Run tests with active package manager
   * @param {...string} args - Test path or additional arguments
   * @param {Object} [options] - child_process.exec options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  test(...vargs) {
    return this.#exec('test', ...vargs)
  }

  /**
   * Pack package with active package manager
   * @param {Object} [options] - child_process.exec options
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  pack(...vargs) {
    return this.#exec('pack', ...vargs)
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `PackageManager { name: "${this.name}" }`
  }

  static #prohibitedCommandRegx = /[;&]/
  static #instance
  #executable
  #userAgent
  #name

  #check(value) {
    if (typeof value !== 'string') return false
    if (this.#executable === value || this.#executable.endsWith(`/${value}`)) return true
    if (this.#userAgent.includes(`${value}/`) || this.#userAgent.includes(`${value}\\`)) return true
    return false
  }

  /**
   * Execute package manager command
   * @private
   * @param {string} key - Command name (exec, lock, pack, test)
   * @param {...string} args - Additional command arguments
   * @param {Object} [options] - child_process.exec options
   * @param {string|Pathname} [options.cwd] - Working directory
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  #exec(...vargs) {
    const {args, kwargs} = xv(...vargs)
    const key = args.shift()
    const prefix = PackageManager.commands[key][this.name]

    if (!prefix) return Promise.resolve({stdout: '', stderr: ''})

    const command = `${prefix} ${args.join(' ')}`.trim()

    if (PackageManager.#prohibitedCommandRegx.test(command)) {
      pub('deny', {error: 'Command is prohibited!', command}, {offset: 5})
      return Promise.reject(new Error(`Prohibited command: ${command}`))
    }

    pub('exec', {command}, {offset: 5})
    const opts = {maxBuffer: 50 * 1024 * 1024, ...kwargs}

    // Convert Pathname to string for cwd
    if (opts.cwd) opts.cwd = String(opts.cwd)

    return new Promise((resolve, reject) => {
      const child = exec(command, opts, (error, stdout, stderr) => {
        if (error) reject(error)
        else resolve({stdout, stderr})
      })

      child.stdout?.pipe(process.stdout)
      child.stderr?.pipe(process.stderr)
    })
  }
}

const pm = PackageManager.instance

export {PackageManager, pm}
