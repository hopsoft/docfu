import fs from 'fs'
import {basename as _basename, join as _join, dirname, relative as _relative} from 'path'
import {homedir} from 'os'
import {fileURLToPath} from 'url'
import {findUpSync as findUp} from 'find-up'
import {globSync} from 'glob'
import {minimatch} from 'minimatch'
import {xv} from './vargs.js'
import {publish as pub} from './event-bus.js'
import {protect} from './safeguards.js'

/**
 * Cast variadic arguments to strings, skipping null/undefined
 * @param {...*} vargs - Arguments that may need string coercion
 * @returns {Array<string>} String-coerced arguments
 * @private
 */
function stringify(...vargs) {
  return vargs.map(v => (v == null ? v : String(v)))
}

/**
 * Get basename with type coercion
 * @param {string} path - Path
 * @param {string} [ext] - Optional extension to remove
 * @returns {string} Basename
 */
function basename(path, ext) {
  return _basename(String(path), ext)
}

/**
 * Check if path likely represents a file (has extension)
 * @param {...string} paths - Path segments
 * @returns {boolean} True if path appears to be a file
 * @private
 */
function isProbableFile(...vargs) {
  const path = normalize(...vargs)
  if (!path) return false

  // Check if path has an extension (anything after last dot)
  const name = _basename(path)
  if (!name || !name.includes('.')) return false

  // If path exists, check if it's actually a directory
  const stats = stat(...vargs)
  if (stats?.isDirectory()) return false

  return true
}

/**
 * Join path segments with type coercion
 * @param {...string} paths - Path segments
 * @returns {string} Joined path
 */
function join(...paths) {
  return _join(...stringify(...paths))
}

/**
 * Finds the closest directory or file by walking up ancestors
 * @param {string} name - Name of directory or file to find
 * @param {...string} paths - Path segments for start location
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Resolved path or undefined
 */
function closest(...vargs) {
  const {args, cb} = xv(...vargs)
  const name = String(args.shift())
  let result

  stat(...args, ({path, stats}) => {
    if (stats.isDirectory()) result = findUp(name, {cwd: path})
    else if (stats.isFile()) result = findUp(name, {cwd: dirname(path)})
    if (result) cb(result)
  })

  return result
}

/**
 * Copy file or directory to new location
 * @param {string} source - Source path
 * @param {string} destination - Destination path
 * @param {Object} [options] - Copy options (passed to fs.cpSync/copyFileSync)
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Destination path or undefined
 */
function copy(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  const src = normalize(args.shift())
  const dest = normalize(args.shift())
  let result

  stat(src, ({path, stats}) => {
    pub('call', {args, kwargs})
    protect(dest)

    if (stats.isDirectory()) fs.cpSync(path, dest, {force: true, recursive: true, ...kwargs})
    else if (stats.isFile()) fs.copyFileSync(path, dest, ...args)
    else return

    result = dest
    cb(result)
  })

  return result
}

/**
 * Gets parent directory path
 * @param {...string} paths - Path segments
 * @param {Object} [options] - Options object
 * @param {boolean} [options.resolve] - If true, resolve path before getting directory
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined}
 */
function directory(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  const strategy = kwargs.resolve ? resolve : normalize
  let path

  strategy(...args, p => {
    path = dirname(p)
    cb(path)
  })

  return path
}

/**
 * Find files matching glob patterns
 * @param {string} pattern - Glob pattern to match
 * @param {...string} paths - Path segments for base directory
 * @param {Object} [options] - Glob options
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {Array<string>} Array of matching file paths
 */
function glob(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  const pattern = args.shift()
  if (!pattern) return

  let results

  normalize(...args, cwd => {
    results = globSync(pattern, {dot: false, ...kwargs, cwd})
    if (results) cb(results)
  })

  return results
}

/**
 * Check if path matches glob patterns
 * @param {string} path - Path to test
 * @param {...string} patterns - Glob patterns to match
 * @returns {boolean} True if path matches any pattern
 */
function matches(...vargs) {
  const {args} = xv(...vargs)
  const path = normalize(args.shift())
  return args.some(pattern => minimatch(path, String(pattern)))
}

/**
 * Create directory
 * @param {...string} paths - Path segments
 * @param {Object} [options]
 * @param {boolean} [options.recursive=true] - Create parent directories as needed
 * @param {boolean} [options.overwrite=false] - Remove existing directory first (custom option)
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string} Created directory path
 */
function mkdir(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  const opts = {recursive: true, overwrite: false, ...kwargs}
  let path

  normalize(...args, normalizedPath => {
    path = normalizedPath
    if (isProbableFile(path)) path = directory(path)
    protect(path)
    if (opts.overwrite) remove(path)
    delete opts.overwrite
    fs.mkdirSync(path, opts)
    cb(path)
  })

  return path
}

/**
 * Move file or directory to new location
 * @param {string} source - Source path
 * @param {string} destination - Destination path
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Destination path or undefined
 */
function move(...vargs) {
  const {args, cb} = xv(...vargs)
  let dest

  resolve(args.shift(), src => {
    pub('call', {args})
    dest = normalize(args.shift())
    protect(src)
    protect(dest)
    if (fs.existsSync(dest)) remove(dest)
    fs.renameSync(src, dest)
    cb(dest)
  })

  return dest
}

/**
 * Normalize path segments (handles ~, file://, relative paths)
 * @param {...string} paths - Path segments
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Normalized path or undefined
 */
function normalize(...vargs) {
  let {args, cb} = xv(...vargs)

  args = stringify(...args)
  if (args.some(a => a == null)) return

  if (args[0] === '~') args[0] = homedir()
  else if (args[0]?.startsWith('~')) args[0] = join(homedir(), args[0].slice(1))
  else if (args[0]?.startsWith('file://')) {
    const before = args[0]
    args[0] = fileURLToPath(args[0])
  }

  const path = join(...args)
  return (cb(path), path)
}

/**
 * Read file or directory contents
 * @param {...string} paths - Path segments
 * @param {Object} [options] - Read options (encoding, etc.)
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|Array|undefined} File contents or directory entries, or undefined
 */
function read(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  let result

  stat(...args, ({path, stats}) => {
    const opts = {encoding: 'utf-8', ...kwargs}

    if (stats.isDirectory()) result = fs.readdirSync(path, opts)
    else if (stats.isFile()) result = fs.readFileSync(path, opts)

    if (result) cb(result)
  })

  return result
}

/**
 * Get relative path with type coercion
 * @param {string} from - From path
 * @param {string} to - To path
 * @returns {string} Relative path
 */
function relative(from, to) {
  return _relative(String(from), String(to))
}

/**
 * Resolves qualified actual path (~/, ./, ../, file URLs, symlinks, etc)
 * @param {...string} paths - Path segments
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Resolved path or undefined
 */
function resolve(...vargs) {
  const {args, cb} = xv(...vargs)
  let path

  normalize(...args, normalizedPath => {
    if (!fs.existsSync(normalizedPath)) return
    path = normalizedPath
    cb(path)
  })

  return path
}

/**
 * Remove directory or file recursively
 * @param {...string} paths - Path segments
 * @param {Object} [options] - Remove options (passed to fs.rmSync)
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string|undefined} Removed path or undefined
 */
function remove(...vargs) {
  const {args, kwargs, cb} = xv(...vargs)
  let path

  resolve(...args, resolvedPath => {
    pub('call', {args, kwargs})
    path = resolvedPath
    protect(path)
    fs.rmSync(path, {force: true, recursive: true, ...kwargs})
    cb(path)
  })

  return path
}

/**
 * Get file or directory stats
 * @param {...string} paths - Path segments
 * @param {Function} [cb] - Optional callback receiving {path, stats} object
 * @returns {Object|undefined} Stats object or undefined
 */
function stat(...vargs) {
  const {args, cb} = xv(...vargs)
  let stats

  resolve(...args, path => {
    stats = fs.statSync(path)
    cb({path, stats})
  })

  return stats
}

/**
 * Write file contents
 * @param {string} path - File path
 * @param {string} content - Content to write
 * @param {string} [encoding='utf-8'] - File encoding
 * @param {Function} [cb] - Optional callback for processing result
 * @returns {string} Written file path
 */
function write(...vargs) {
  const {args, cb} = xv(...vargs)
  let path

  normalize(args.shift(), normalizedPath => {
    pub('call', {args})
    path = normalizedPath
    protect(path)
    mkdir(directory(path))

    const content = args.shift()
    const encoding = args.shift() || 'utf-8'
    fs.writeFileSync(path, content, encoding)
    cb(path)
  })

  return path
}

export {
  basename,
  closest,
  copy,
  directory,
  glob,
  join,
  matches,
  mkdir,
  move,
  normalize,
  read,
  relative,
  remove,
  resolve,
  stat,
  write,
}
