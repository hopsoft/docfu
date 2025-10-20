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
  writeFileSync,
} from 'fs'
import {homedir} from 'os'
import {basename as pathBasename, dirname as pathDirname, join} from 'path'
import {fileURLToPath} from 'url'
import {findUpSync as findUp} from 'find-up'
import {extractOptions} from './arguments.js'
import bus from './bus.js'
import './logger.js'

const __file = basename(import.meta.url)

/**
 * Expand tilde (~) in file paths to home directory
 * @param {string} path - Path that may contain tilde
 * @returns {string} Expanded path
 */
function expandTilde(path) {
  if (!path) return path
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

/**
 * Finds the closest directory or file by walking up ancestors
 * @param {string} name - Name to find
 * @param {string} dir - Starting directory
 * @returns {string|undefined} Resolved path or undefined
 */
function closest(name, dir) {
  if (!exists(dir)) {
    bus.pub('missing', {closest: [...arguments]})
    return
  }
  return realpath(findUp(name, {cwd: dir}))
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
function copyDir(src, dest, opts = {force: true, recursive: true}) {
  bus.pub('call', {file: __file, copyDir: {src, dest, opts}})
  const source = realpath(src)
  if (!source) {
    bus.pub('missing', {copyDir: [...arguments]})
    return
  }
  mkdir(dirname(dest))
  cpSync(source, dest, opts)
  return dest
}

/**
 * Copy file with automatic destination directory creation
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @param {number} [mode=0] - fs.copyFileSync mode flags
 * @returns {string|undefined} Destination path or undefined
 */
function copyFile(src, dest, mode = 0) {
  bus.pub('call', {file: __file, copyFile: {src, dest, mode}})
  const source = realpath(src)
  if (!source) {
    bus.pub('missing', {copyFile: [...arguments]})
    return
  }
  mkdir(pathDirname(dest))
  copyFileSync(source, dest, mode)
  return dest
}

/**
 * Gets basename of a path
 * @param {string} path - File or directory path
 * @param {string} [ext] - Optional extension to remove
 * @returns {string|undefined} Basename or undefined
 */
function basename(path, ext) {
  if (typeof path !== 'string') return undefined
  return pathBasename(path, ext)
}

/**
 * Gets parent directory of a path
 * @param {string} path - directory, file, file URL
 * @returns {string|undefined} Resolved directory or undefined
 */
function dirname(path) {
  if (typeof path !== 'string') return undefined
  if (path.startsWith('file://')) path = fileURLToPath(path)
  return realpath(pathDirname(path))
}

/**
 * Checks if path exists on filesystem and is valid
 * @param {string} path - Path to check
 * @returns {boolean}
 */
function exists(path) {
  if (typeof path !== 'string') return false
  return realpath(path) !== undefined
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
  let {args, opts} = extractOptions(...arguments)
  opts = {recursive: true, overwrite: false, ...opts}
  bus.pub('call', {file: __file, mkdir: {args, opts}})

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
  bus.pub('call', {file: __file, move: {src, dest}})
  const source = realpath(src)
  if (!source) {
    bus.pub('missing', {move: [...arguments]})
    return
  }
  mkdir(pathDirname(dest))
  renameSync(source, dest)
  return dest
}

/**
 * Read file contents
 * @param {string} path - File path
 * @param {string} [enc='utf-8'] - File encoding
 * @returns {string|undefined} File contents or undefined
 */
function read(path, enc = 'utf-8') {
  bus.pub('call', {file: __file, read: {path, enc}})
  const real = realpath(path)
  if (!real) {
    bus.pub('missing', {read: [...arguments]})
    return
  }
  return readFileSync(real, enc)
}

/**
 * Read directory contents
 * @param {string} path - Directory path
 * @returns {Array<string>|undefined} Array of file/directory names or undefined
 */
function readdir(path) {
  const real = realpath(path)
  if (!real) {
    bus.pub('missing', {readdir: [...arguments]})
    return
  }
  return readdirSync(real)
}

/**
 * Resolves absolute path
 * @param {...string} paths - Path segments to join
 * @returns {string|undefined} Resolved path or undefined
 */
function realpath() {
  const path = expandTilde(join(...arguments))
  try {
    if (existsSync(path)) return realpathSync(path)
  } catch (error) {
    bus.pub('warn', {realpath: arguments, error})
  }
}

/**
 * Remove file or directory recursively
 * @param {...string} paths - Path segments to join
 * @returns {string|undefined} Removed path or undefined
 */
function rm() {
  let {args, opts} = extractOptions(...arguments)
  opts = {force: true, recursive: true, ...opts}
  bus.pub('call', {file: __file, rm: {args, opts}})
  const path = realpath(...args)
  if (!path) {
    bus.pub('missing', {rm: args})
    return
  }

  rmSync(path, opts)
  return path
}

/**
 * Walk directory recursively
 * @param {string} dir - Directory path
 * @param {Function} [filter] - Optional filter function (path => boolean)
 * @returns {Array<string>} Array of file paths
 */
function walk(dir, filter) {
  const path = realpath(dir)
  if (!path) {
    bus.pub('missing', {walk: [...arguments]})
    return []
  }

  const results = []
  const entries = readdirSync(path, {withFileTypes: true})

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
  bus.pub('call', {write: [path, content, enc]})
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
  join,
  mkdir,
  move,
  read,
  readdir,
  realpath,
  rm,
  walk,
  write,
}
