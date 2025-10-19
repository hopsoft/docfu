const EXECUTABLE = String(process.argv[0]).toLowerCase()
const USER_AGENT = String(process.env.npm_config_user_agent || '').toLowerCase()

let name

const commands = {
  exec: {
    bun: 'bunx --no-install',
    yarn: 'yarn dlx --quiet',
    pnpm: 'pnpm dlx --quiet',
    npm: 'npx --no-install',
  },

  install: {
    bun: 'bun install --global --no-progress',
    npm: 'npm install --global --prefer-offline --no-audit --no-fund --progress=false',
    pnpm: 'pnpm install --global --prefer-offline --no-audit --reporter=hide',
    yarn: 'yarn global add --prefer-offline --non-interactive --no-progress',
  },

  pack: {
    bun: 'bun pm pack --no-progress',
    npm: 'npm pack --quiet',
    pnpm: 'pnpm pack --silent',
    yarn: 'yarn pack --quiet',
  },
}

function check(value) {
  value = String(value).toLowerCase()
  if (EXECUTABLE === value || EXECUTABLE.endsWith(`/${value}`)) return true
  if (USER_AGENT.includes(`${value}/`) || USER_AGENT.includes(`${value}\\`)) return true
  return false
}

/**
 * Detect package manager from environment
 * @returns {string} Package manager name (bun, npm, pnpm, yarn)
 */
function getPackageManagerName() {
  if (name) return name
  if (check('bunx') || check('bun')) return (name = 'bun')
  if (check('npx') || check('npm')) return (name = 'npm')
  if (check('pnpmx') || check('pnpm')) return (name = 'pnpm')
  if (check('yarn')) return (name = 'yarn')
  return (name = 'npm')
}

/**
 * Get a package manager command with optional args
 * @param {string} name - Command name (exec, install, pack)
 * @param {string} [args=''] - Additional command arguments
 * @returns {string|undefined} Full command string or undefined if command not found
 */
function getPackageManagerCmd(name, args = '') {
  return commands[name] ? `${commands[name][getPackageManagerName()]} ${args}`.trim() : undefined
}

export {getPackageManagerName, getPackageManagerCmd}
