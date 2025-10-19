import {execSync} from 'child_process'
import theme from './theme.js'

/**
 * Execute shell command
 * @param {...string} args - Command segments (joined)
 * @param {Object} [options] - child_process.execSync options
 * @param {string} [options.stdio='inherit'] - Standard I/O configuration
 * @returns {Buffer|string|undefined} Command output or undefined
 */
export function exec() {
  const args = [...arguments]
  const opts = typeof args[args.length - 1] === 'object' ? args.pop() : {stdio: 'inherit'}
  const cmd = args.join(' ')
  console.info(theme.lead('➜ exec'), theme.command(cmd))
  const result = execSync(cmd, opts)
  return result
}
