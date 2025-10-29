import {
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
} from './pathname-utils.js'
import {isProtected} from './safeguards.js'

/**
 * Object-oriented wrapper for file system paths
 * Provides chainable methods and automatic normalization
 * Accepts both strings and Pathname instances for path arguments
 */
class Pathname {
  #vargs
  #literal
  #normalized

  /**
   * Create a new Pathname
   * @param {...(string|Pathname)} vargs - Variadic path segments to join and normalize
   */
  constructor(...vargs) {
    if (vargs.length === 1 && vargs[0] instanceof Pathname) return vargs[0]

    this.#vargs = Object.freeze(vargs)
    this.#literal = join(...vargs)
    this.#normalized = normalize(...vargs)
  }

  /**
   * Create Pathname from value (static factory method)
   * Returns existing Pathname instances unchanged, converts other values to Pathname
   * Enables pattern: Pathname.from(value) similar to Array.from(value)
   * @param {...(string|Pathname)} vargs - Path segments to convert
   * @returns {Pathname} Pathname instance
   * @example
   * Pathname.from('~/docs')  // new Pathname('~/docs')
   * Pathname.from(existingPathname)  // returns existingPathname unchanged
   */
  static from(...vargs) {
    if (vargs.length === 1 && vargs[0] instanceof Pathname) return vargs[0]
    return new Pathname(...vargs)
  }

  /**
   * Get parent directory as Pathname
   * Uses Node.js path.dirname() on normalized path
   * @returns {Pathname} Parent directory
   * @example
   * new Pathname('/foo/bar/baz.txt').directory  // Pathname('/foo/bar')
   */
  get directory() {
    return new Pathname(directory(this.#normalized))
  }

  /**
   * Check if path exists on filesystem
   * Uses fs.existsSync() to verify path exists
   * @returns {boolean} True if path exists
   * @example
   * new Pathname('/tmp/file.txt').exists  // true/false
   */
  get exists() {
    return !!resolve(this.#normalized)
  }

  /**
   * Check if path is a directory
   * Uses fs.statSync() to check if path is a directory
   * @returns {boolean} True if path exists and is a directory
   * @example
   * new Pathname('/tmp').isDirectory  // true
   */
  get isDirectory() {
    return !!this.stat()?.isDirectory()
  }

  /**
   * Check if path is a file
   * Uses fs.statSync() to check if path is a file
   * @returns {boolean} True if path exists and is a file
   * @example
   * new Pathname('/tmp/file.txt').isFile  // true
   */
  get isFile() {
    return !!this.stat()?.isFile()
  }

  /**
   * Check if path is protected by safeguards
   * Checks both literal and normalized paths against protection rules
   * Protects: /, ~, ., .., system dirs, parent dirs of cwd
   * Allows: /tmp/*, .docfu/*
   * @returns {boolean} True if path is protected from deletion/modification
   * @example
   * new Pathname('/').isProtected        // true
   * new Pathname('~').isProtected        // true
   * new Pathname('/tmp/foo').isProtected // false
   */
  get isProtected() {
    return isProtected(this.#literal) || isProtected(this.#normalized)
  }

  /**
   * Get literal path (joined input before normalization)
   * Preserves original input like ~ and . without expansion
   * @returns {string} Literal joined path
   * @example
   * new Pathname('~', 'docs').literal  // '~/docs'
   */
  get literal() {
    return this.#literal
  }

  /**
   * Get normalized path (with ~ and file:// expanded)
   * Expands ~ to homedir and file:// URLs to paths
   * @returns {string} Normalized path
   * @example
   * new Pathname('~', 'docs').normalized  // '/Users/username/docs'
   */
  get normalized() {
    return this.#normalized
  }

  /**
   * Get original variadic arguments passed to constructor
   * Frozen array of original path segments
   * @returns {Array} Original path segments
   * @example
   * new Pathname('~', 'docs', 'file.txt').vargs  // ['~', 'docs', 'file.txt']
   */
  get vargs() {
    return this.#vargs
  }

  /**
   * Get basename (filename) of path
   * Uses Node.js path.basename() with optional extension removal
   * @param {string} [ext] - Extension to remove (e.g., '.md', '.txt')
   * @returns {string} Basename of path
   */
  basename(...vargs) {
    return basename(this.#normalized, ...vargs)
  }

  /**
   * Find closest ancestor directory containing named file/directory
   * Walks up directory tree searching for specified name
   * Useful for finding project roots (e.g., package.json, .git)
   * @param {string} name - Name of file or directory to search for
   * @returns {Pathname|undefined} Pathname of ancestor directory if found, undefined otherwise
   */
  closest(name) {
    const result = closest(name, this.#normalized)
    return result ? new Pathname(result) : undefined
  }

  /**
   * Copy path to destination
   * Uses fs.cpSync() for directories (recursive), fs.copyFileSync() for files
   * Creates parent directories automatically if needed
   * Accepts optional callback as final argument
   * @param {string|Pathname} destination - Destination path
   * @param {Function} [callback] - Optional callback function
   * @returns {Pathname} Pathname of destination for chaining
   */
  copy(destination, ...vargs) {
    copy(this.#normalized, String(destination), ...vargs)
    return new Pathname(destination)
  }

  /**
   * Check if path equals another path
   * Normalizes both paths before comparing to handle ~, file://, and relative paths correctly
   * @param {string|Pathname} other - Path to compare against
   * @returns {boolean} True if normalized paths are equal
   * @example
   * new Pathname('~/docs').equals('~/docs')  // true
   * new Pathname('~/docs').equals(new Pathname('~/docs'))  // true
   */
  equals(other) {
    const otherPath = other instanceof Pathname ? other : new Pathname(other)
    return this.#normalized === otherPath.#normalized
  }

  /**
   * Find files matching glob pattern
   * Uses globSync() to search within this directory
   * Supports ** for recursive search, * for wildcards, braces for alternatives
   * @param {string} pattern - Glob pattern
   * @param {Object} [options] - Additional glob options
   * @returns {Array<string>} Array of matching file paths
   */
  glob(pattern, ...vargs) {
    return glob(pattern, this.#normalized, ...vargs)
  }

  /**
   * Join path segments to create new Pathname
   * Appends segments to current path and returns new Pathname instance
   * Original Pathname remains unchanged (immutable)
   * @param {...(string|Pathname)} vargs - Path segments to append
   * @returns {Pathname} New Pathname with joined segments
   */
  join(...vargs) {
    return new Pathname(this.#normalized, ...vargs)
  }

  /**
   * Check if path matches glob pattern(s)
   * Uses minimatch for pattern matching
   * Returns true if path matches ANY of the provided patterns
   * @param {...string} vargs - One or more glob patterns to test
   * @returns {boolean} True if path matches any pattern
   * @example
   * new Pathname('/foo/test.js').matches('*.md', '*.js')  // true (matches second pattern)
   */
  matches(...vargs) {
    return matches(this.#normalized, ...vargs)
  }

  /**
   * Create directory at path
   * Uses fs.mkdirSync() with recursive option (creates parent directories)
   * No-op if directory already exists
   * Accepts optional callback as final argument
   * @param {Function} [callback] - Optional callback function
   * @returns {Pathname} This Pathname for chaining
   */
  mkdir(...vargs) {
    mkdir(this.#normalized, ...vargs)
    return this
  }

  /**
   * Move path to destination
   * Uses fs.renameSync() to move/rename files or directories
   * Creates parent directories at destination automatically if needed
   * Accepts optional callback as final argument
   * @param {string|Pathname} destination - Destination path
   * @param {Function} [callback] - Optional callback function
   * @returns {Pathname} Pathname of destination for chaining
   */
  move(destination, ...vargs) {
    move(this.#normalized, String(destination), ...vargs)
    return new Pathname(destination)
  }

  /**
   * Read file contents or directory entries
   * For files: Uses fs.readFileSync() with utf8 encoding, returns string
   * For directories: Uses fs.readdirSync(), returns array of filenames
   * @returns {string|Array<string>} File contents as string, or directory entries as array
   */
  read() {
    return read(this.#normalized)
  }

  /**
   * Get relative path from this path to another
   * Uses Node.js path.relative() to compute the relative path
   * Useful for generating import paths or relative links
   * @param {string|Pathname} to - Target path
   * @returns {string} Relative path from this to target
   * @example
   * new Pathname('/foo/bar').relative('/foo/baz/file.txt')  // '../baz/file.txt'
   */
  relative(to, ...vargs) {
    return relative(this.#normalized, String(to), ...vargs)
  }

  /**
   * Remove path from filesystem
   * Uses fs.rmSync() with recursive option for directories
   * Protected paths (/, ~, ., .., system dirs) cannot be removed
   * Throws error if path is protected or doesn't exist
   * @returns {Pathname} This Pathname for chaining
   */
  remove() {
    remove(this.#normalized)
    return this
  }

  /**
   * Get fs.Stats for path
   * Uses fs.statSync() to retrieve filesystem metadata
   * Returns undefined if path doesn't exist (instead of throwing)
   * @returns {fs.Stats|undefined} Stats object with isFile(), isDirectory(), size, mtime, etc., or undefined
   */
  stat() {
    return stat(this.#normalized)
  }

  /**
   * Convert path to string
   * Enables: String(path), JSON.stringify(path), console.log(path), etc
   * Returns normalized path (expanded ~ and file:// URLs)
   * @returns {string} Normalized path as string
   */
  toString() {
    return this.#normalized
  }

  /**
   * Get primitive value of path
   * Enables: relational comparisons (<, >, <=, >=), arithmetic operations, array sorting, etc
   * Note: Symbol.toPrimitive takes precedence when present
   * Returns normalized path (expanded ~ and file:// URLs)
   * @returns {string} Normalized path as string
   */
  valueOf() {
    return this.#normalized
  }

  /**
   * Write content to file
   * Uses fs.writeFileSync() with utf8 encoding for strings
   * Creates parent directories automatically if needed
   * Accepts optional callback as final argument
   * @param {string|Buffer} content - Content to write to file
   * @param {Function} [callback] - Optional callback function
   * @returns {undefined} No return value
   */
  write(...vargs) {
    return write(this.#normalized, ...vargs)
  }

  /**
   * Enable type coercion to string (takes precedence over toString/valueOf)
   * Enables: arithmetic operations, concatenation `'' + path`, comparisons (==, !=, <, >, <=, >=),
   *          template literals `${path}`, String(path), etc
   * @private
   * @returns {string} Path as string
   */
  [Symbol.toPrimitive](_hint) {
    return this.#normalized
  }

  /**
   * Custom inspect for Node.js util.inspect
   * Provides clean output in console.log, debugger, and REPL
   * @returns {string} Formatted pathname representation
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Pathname { "${this.#normalized}", exists: ${this.exists} }`
  }
}

export {Pathname}
