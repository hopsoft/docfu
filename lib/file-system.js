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
import theme from './theme.js'

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
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('closest'), theme.muted(dir))
    return
  }
  return realpath(findUp(name, {cwd: dir}))
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * @param {Object} [options] - fs.cpSync options
 * @param {boolean} [options.force=true] - Overwrite existing files
 * @param {boolean} [options.recursive=true] - Copy directories recursively
 * @returns {string|undefined} Destination path or undefined
 */
function copyDir(src, dest, options = {force: true, recursive: true}) {
  console.info(theme.lead('➜ copyDir'), src, '→', dest)
  const source = realpath(src)
  if (!source) {
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('copyDir'), theme.muted(src))
    return
  }
  mkdir(dirname(dest))
  cpSync(source, dest, options)
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
  console.info(theme.lead('➜ copyFile'), src, '➜', dest)
  const source = realpath(src)
  if (!source) {
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('copyFile'), theme.muted(src))
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
 * @param {Object} [options] - fs.mkdirSync options
 * @param {boolean} [options.recursive=true] - Create parent directories as needed
 * @param {boolean} [options.overwrite] - Remove existing directory first (custom option)
 * @returns {string} Created directory path
 */
function mkdir() {
  const args = [...arguments]
  const opts = typeof args[args.length - 1] === 'object' ? args.pop() : {recursive: true}

  console.info(theme.lead('➜ mkdir'), join(...args))
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
  console.info(theme.lead('➜ move'), src, '➜', dest)
  const source = realpath(src)
  if (!source) {
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('move'), theme.muted(src))
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
  console.info(theme.lead('➜ read'), path, enc)
  const real = realpath(path)
  if (!real) {
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('read'), theme.muted(path))
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
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('readdir'), theme.muted(path))
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
  const path = join(...arguments)
  try {
    if (existsSync(path)) return realpathSync(path)
  } catch (err) {
    console.warn(theme.warning('✗ WARNING'), theme.muted('realpath'), theme.muted(path), err.message)
  }
}

/**
 * Remove file or directory recursively
 * @param {...string} paths - Path segments to join
 * @returns {string|undefined} Removed path or undefined
 */
function rm() {
  console.info(theme.lead('➜ rm'), join(...arguments))

  const path = realpath(...arguments)
  if (!path) {
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('rm'), theme.muted(join(...arguments)))
    return
  }

  rmSync(path, {force: true, recursive: true})
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
    console.warn(theme.warning('✗ NOT FOUND'), theme.muted('walk'), theme.muted(dir))
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
  console.info(theme.lead('➜ write'), path)
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
  expandTilde,
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
