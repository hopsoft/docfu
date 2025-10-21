export function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || ''
  const executable = process.argv[0].toLowerCase()

  if (process.env.BUN_VERSION || userAgent.includes('bun/') || executable.includes('bun')) return 'bun'
  if (userAgent.includes('yarn/') || process.env.YARN_WRAP_OUTPUT) return 'yarn'
  if (userAgent.includes('pnpm/') || process.env.pnpm_config_user_agent) return 'pnpm'
  if (userAgent.includes('npm/') || process.env.npm_lifecycle_event) return 'npm'

  return 'npm' // fallback
}

export function getYarnMajorVersion() {
  const userAgent = process.env.npm_config_user_agent || ''
  const match = userAgent.match(/yarn\/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}
