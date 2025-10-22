import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import {homedir} from 'os'
import {basename as pathBasename, dirname as pathDirname, join} from 'path'
import {fileURLToPath} from 'url'
import {findUpSync as findUp} from 'find-up'
import {parseArguments} from './arguments.js'
import {safeguard} from './safeguard.js'
import bus from './bus.js'

const FILE = import.meta.url.split('/docfu/').pop()

/**
 * Gets basename of a path
 * @param {string} path - File or directory path
 * @param {string} [ext] - Optional extension to remove
 * @returns {string|undefined} Basename or undefined
 */
function basename(path, ext) {
  if (typeof path === 'string') return pathBasename(path, ext)
}

/**
 * Finds the closest directory or file by walking up ancestors
 * @param {string} name - Name to find
 * @param {string} dir - Starting directory
 * @returns {string|undefined} Resolved path or undefined
 */
function closest() {
  const {args} = parseArguments(...arguments)
  const name = args.shift()
  let path = realpath(...args)
  try {
    if (typeof name === 'string' && isDir(path)) return realpath(findUp(name, {cwd: path}))
  } catch {}
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * @param {Object} [opts] - fs.cpSync options
 * @param {boolean} [opts.force=true] - Overwrite existing files
 * @param {boolean} [opts.recursive=true] - Copy directories recursively
 * @returns {string|undefined} Destination path or undefined
 */
function copyDir(src, dest, opts) {
  opts = {force: true, recursive: true, ...(opts || {})}
  bus.pub('call', {FILE, copyDir: {src, dest, opts}})
  const source = realpath(src)
  if (isDir(source)) {
    safeguard(dest)
    mkdir(dirname(dest))
    cpSync(source, dest, opts)
    return dest
  }
}

/**
 * Copy file with automatic destination directory creation
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @param {number} [mode=0] - fs.copyFileSync mode flags
 * @returns {string|undefined} Destination path or undefined
 */
function copyFile(src, dest, mode = 0) {
  bus.pub('call', {FILE, copyFile: {src, dest, mode}})
  const source = realpath(src)
  if (isFile(source)) {
    mkdir(pathDirname(dest))
    copyFileSync(source, dest, mode)
    return dest
  }
}

/**
 * Gets parent directory of a path
 * @param {string} path - directory, file, file URL
 * @returns {string|undefined} Resolved directory or undefined
 */
function dirname() {
  const path = normalizePath(...arguments)
  if (path?.length) return pathDirname(path)
}

/**
 * Checks if path exists on filesystem and is valid
 * @param {...string} paths - Path segments (joined)
 * @returns {boolean}
 */
function exists() {
  return realpath(...arguments) !== undefined
}

/**
 * Check if path is a directory
 * @param {string} path - Path to check
 * @returns {boolean} True if path exists and is a directory
 */
function isDir() {
  try {
    return statSync(realpath(...arguments)).isDirectory()
  } catch {}
}

/**
 * Check if path is a file
 * @param {string} path - Path to check
 * @returns {boolean} True if path exists and is a file
 */
function isFile() {
  try {
    return statSync(realpath(...arguments)).isFile()
  } catch {}
}

/**
 * Create directory recursively
 * @param {...string} paths - Path segments (joined)
 * @param {Object} [opts] - fs.mkdirSync options
 * @param {boolean} [opts.recursive=true] - Create parent directories as needed
 * @param {boolean} [opts.overwrite=false] - Remove existing directory first (custom option)
 * @returns {string} Created directory path
 */
function mkdir() {
  let {args, opts} = parseArguments(...arguments)
  opts = {recursive: true, overwrite: false, ...opts}
  bus.pub('call', {FILE, mkdir: {args, opts}})

  if (opts.overwrite) rm(...args)
  delete opts.overwrite

  const path = join(...args)
  mkdirSync(path, opts)
  return path
}

/**
 * Move file or directory to new location
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @returns {string|undefined} Destination path or undefined
 */
function move(src, dest) {
  bus.pub('call', {FILE, move: {src, dest}})
  const source = realpath(src)
  if (source) {
    safeguard(source, dest)
    mkdir(pathDirname(dest))
    renameSync(source, dest)
    return dest
  }
}

function normalizePath() {
  let {args} = parseArguments(...arguments)
  if (args[0] === '~') args[0] = homedir()
  else if (args[0]?.startsWith('~')) args[0] = join(homedir(), args[0].slice(1))
  else if (args[0]?.startsWith('file://')) args[0] = fileURLToPath(args[0])
  return join(...args)
}

/**
 * Read file contents
 * @param {string} path - File path
 * @param {string} [enc='utf-8'] - File encoding
 * @returns {string|undefined} File contents or undefined
 */
function read() {
  let {args, opts} = parseArguments(...arguments)
  opts = {enc: 'utf-8', ...opts}
  const path = realpath(...args)
  if (isFile(path)) return readFileSync(path, opts.enc)
}

/**
 * Read directory contents
 * @param {string} path - Directory path
 * @returns {Array<string>|undefined} Array of file/directory names or undefined
 */
function readdir() {
  const path = realpath(...arguments)
  if (isDir(path)) return readdirSync(path)
}

/**
 * Resolves qualified actual path (~/, ./, ../, file URLs, symlinks, etc)
 * @param {...string} paths - Path segments to join
 * @returns {string|undefined} Resolved path or undefined
 */
function realpath() {
  try {
    return realpathSync(normalizePath(...arguments))
  } catch {}
}

/**
 * Remove file or directory recursively
 * @param {...string} paths - Path segments to join
 * @returns {string|undefined} Removed path or undefined
 */
function rm() {
  let {args, opts} = parseArguments(...arguments)
  opts = {force: true, recursive: true, ...opts}
  bus.pub('call', {FILE, rm: {args, opts}})
  const path = realpath(...args)
  if (path) {
    safeguard(path)
    rmSync(path, opts)
    return path
  }
}

/**
 * Walk directory recursively
 * @param {string} dir - Directory path
 * @param {Function} [filter] - Optional filter function (path => boolean)
 * @param {Object} [opts] - fs.readdirSync options
 * @param {boolean} [opts.withFileTypes=true] - Return Dirent objects
 * @returns {Array<string>} Array of file paths
 */
function walk(dir, filter, opts) {
  opts = {withFileTypes: true, ...(opts || {})}
  const path = realpath(dir)
  const results = []
  const entries = readdirSync(path, opts)

  for (const entry of entries) {
    const fullPath = join(path, entry.name)
    if (entry.isDirectory()) results.push(...walk(fullPath, filter))
    else if (entry.isFile() && (!filter || filter(fullPath))) results.push(fullPath)
  }

  return results
}

/**
 * Write file contents
 * @param {string} path - File path
 * @param {string} content - Content to write
 * @param {string} [enc='utf-8'] - File encoding
 * @returns {string} Written file path
 */
function write(path, content, enc = 'utf-8') {
  bus.pub('call', {FILE, write: {path, content, enc}})
  safeguard(path)
  mkdir(pathDirname(path))
  writeFileSync(path, content, enc)
  return path
}

export {
  basename,
  closest,
  copyDir,
  copyFile,
  dirname,
  exists,
  isDir,
  isFile,
  join,
  mkdir,
  move,
  normalizePath,
  read,
  readdir,
  realpath,
  rm,
  walk,
  write,
}
