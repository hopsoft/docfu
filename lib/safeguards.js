import {homedir} from 'os'
import {publish as pub} from './event-bus.js'

/**
 * Literal paths that are explicitly protected
 * These are checked before pattern matching for exact string equality
 */
const PROTECTED_LITERALS = Object.freeze(['/', '~', '~/', '.', '..'])

const PROTECTED_PATTERNS = Object.freeze([
  // Roots
  new RegExp('^/$'), // ..................... root directory
  new RegExp('^~/?$'), // ................... home directory
  new RegExp('^./?$'), // ................... current directory
  new RegExp('^(../?)+$'), // ............... parent directories
  new RegExp('^[0-9A-Z]+:$', 'i'), // ....... windows roots
  new RegExp(`^${process.cwd()}/?$`), // .... current directory (resolved)

  // Unix/Linux/macOS system
  new RegExp('[.][0-9A-Z]+/?$', 'i'), // .... dot directories/files (.git, etc)
  new RegExp('^/(Application|Librar(ie|y)|System|User|Volume)s?/?$', 'i'),
  new RegExp('^/(bin|boot|cores|dev|etc|home|nix|opt|private|proc|root|sbin|sys|tmp|usr|var)/?$', 'i'),

  // Windows system
  new RegExp('^[0-9A-Z]+:\\+(Program|Window)s?/?$', 'i'),

  // User directories
  new RegExp(`^${homedir()}/?$`), // ........ home directory (resolved)
  new RegExp(`^${homedir()}/\\.[0-9A-Z]+/?$`, 'i'),
  new RegExp(
    `^${homedir()}/(Application|Desktop|Document|Download|Dropbox|Library|Movie|Music|Picture|Public|Site|Video)s?/?$`,
    'i'
  ),
])

const ALLOWED_PATTERNS = Object.freeze([
  new RegExp('^/private/tmp/.+$', 'i'),
  new RegExp('^/private/var/folders/.+$', 'i'),
  new RegExp('^/tmp/.+$', 'i'),
  new RegExp('^/var/folders/.+$', 'i'),
  new RegExp(`^${process.cwd()}/[.]?tmp/.+$`, 'i'), // ... cwd tmp directory
  new RegExp('/[.]docfu(/.+)?$', 'i'), // ................ docfu sandbox directories
])

/**
 * Check if path is protected from modification/deletion
 * @param {string} path - Path to check
 * @returns {boolean} True if path is protected
 */
function isProtected(path) {
  if (path == null) return true

  path = String(path)
  if (path.trim().length === 0) return true

  // Check literal matches first
  if (PROTECTED_LITERALS.some(literal => path === literal)) return true

  // Check allowed exception patterns
  if (path && ALLOWED_PATTERNS.some(p => p.test(path))) return false

  // Check if path is a parent directory of cwd (literal match)
  let parent = process.cwd()
  while (parent !== '/') {
    if (path === parent) return true
    parent = parent.substring(0, parent.lastIndexOf('/')) || '/'
  }

  // Check protected patterns
  if (path && PROTECTED_PATTERNS.some(p => p.test(path))) return true

  return false
}

/**
 * Protect critical paths
 * @param {string} path - Path to check
 */
function protect(path) {
  if (isProtected(path)) {
    pub('fail', {error: 'Path is protected!', path})
    throw new Error(`Path is protected! ${path}`)
  }
}

export {isProtected, protect}
