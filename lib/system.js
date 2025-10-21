import {execSync} from 'child_process'
import {parseArguments} from './arguments.js'
import {basename} from './file-system.js'
import bus from './bus.js'
import './logger.js'

const __file = basename(import.meta.url)

/**
 * Execute command in a subprocess
 * @param {...string} args - Command segments (joined)
 * @param {Object} [options] - child_process.execSync options
 * @param {string} [options.stdio='inherit'] - Standard I/O configuration
 * @returns {Buffer|string|undefined} Command output or undefined
 */
function system() {
  let {args, opts} = parseArguments(...arguments)
  bus.pub('exec', {file: __file, system: {args, opts}})
  opts = {stdio: 'inherit', ...opts}
  const cmd = args.join(' ').trim()
  return execSync(cmd, opts)
}

export {system}
