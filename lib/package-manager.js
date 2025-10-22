const EXECUTABLE = String(process.argv[0]).toLowerCase()
const USER_AGENT = String(process.env.npm_config_user_agent || '').toLowerCase()

const LOCKFILES = {
  npm: 'package-lock.json',
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lock',
}

const COMMANDS = {
  exec: {
    bun: 'bunx --no-install',
    npm: 'npx --no-install',
    pnpm: 'pnpm dlx --quiet',
    yarn: 'yarn dlx --quiet',
  },

  install: {
    bun: 'bun install --global --no-progress',
    npm: 'npm install --global --prefer-offline --no-audit --no-fund --progress=false',
    pnpm: 'pnpm install --global --prefer-offline --no-audit --reporter=hide',
    yarn: 'yarn global add --prefer-offline --non-interactive --no-progress',
  },

  lockfile: {
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
    bun: `bunx vitest run`,
    npm: `npx vitest run`,
    pnpm: `pnpm dlx vitest run`,
    yarn: `yarn dlx vitest run`,
  },
}

function assert(value, opts = {explicit: false}) {
  value = String(value).toLowerCase()

  // explicit: basic check
  if (opts.explicit && Object.keys(LOCKFILES).includes(value)) return true

  // implicit: runtime checks
  if (EXECUTABLE === value || EXECUTABLE.endsWith(`/${value}`)) return true
  if (USER_AGENT.includes(`${value}/`) || USER_AGENT.includes(`${value}\\`)) return true

  return false
}

function refute() {
  return !assert(...arguments)
}

function detect() {
  if (process.env.DOCFU_PM && assert(process.env.DOCFU_PM, {explicit: true})) return process.env.DOCFU_PM
  if (assert('bunx') || assert('bun')) return 'bun'
  if (assert('npx') || assert('npm')) return 'npm'
  if (assert('pnpmx') || assert('pnpm')) return 'pnpm'
  if (assert('yarn')) return 'yarn'
  return 'npm'
}

const pkgmgr = {
  get commands() {
    return {...COMMANDS}
  },

  get lockfiles() {
    return {...LOCKFILES}
  },

  /**
   * Get detected package manager name
   * @returns {string} Package manager (bun, npm, pnpm, yarn)
   */
  get name() {
    return detect()
  },

  /**
   * Get lockfile name for current package manager
   * @returns {string} Lockfile filename
   */
  get lockfile() {
    return LOCKFILES[this.name]
  },

  /**
   * Gets a named command for the package manager
   * @param {string} key - Command name (exec, install, lockfile, pack, test)
   * @param {string} [pm] - Package manager to use (overrides active runtime pkgmgr)
   * @returns {string|undefined} Command string or undefined if not found
   */
  getCommand(key, pm) {
    pm ||= this.name
    if (pm !== this.name && refute(pm, {explicit: true})) pm = this.name
    return COMMANDS[key][pm]
  },
}

export default pkgmgr
