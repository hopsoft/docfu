import {homedir} from 'os'
import {basename} from 'path'
import bus from './bus.js'

const __file = basename(import.meta.url)
const CWD = process.cwd()
const HOME = homedir()

const PROTECTED = [
  // Roots
  new RegExp(`^/$`),
  new RegExp('^[0-9A-Z]+:\\\\$', 'i'),
  new RegExp(`^${CWD}/?$`),

  // Unix/Linux/macOS system
  new RegExp('/\\.[0-9A-Z]+/?$', 'i'),
  new RegExp('^/(Application|Librar(ie|y)|System|User|Volume)s?/?$', 'i'),
  new RegExp('^/(bin|boot|cores|dev|etc|home|nix|opt|private|proc|root|sbin|sys|tmp|usr|var)/?$', 'i'),

  // Windows system
  new RegExp('^[0-9A-Z]+:\\\\(Program|Window)s?/?$', 'i'),

  // User directories
  new RegExp(`^${HOME}/\\.[0-9A-Z]+/?$`, 'i'),
  new RegExp(
    `^${HOME}/(Application|Desktop|Document|Download|Dropbox|Library|Movie|Music|Picture|Public|Site|Video)s?/?$`,
    'i'
  ),
]

const TMP = [
  new RegExp('^/private/tmp/.+$', 'i'),
  new RegExp('^/private/var/folders/.+$', 'i'),
  new RegExp('^/tmp/.+$', 'i'),
  new RegExp('^/var/folders/.+$', 'i'),
  new RegExp(`^${CWD}/[.]?tmp/.+$`, 'i'), // Project tmp directory
  new RegExp('/[.]docfu/?$', 'i'), // DocFu sandbox directories
]

function isProtectedDir(path) {
  if (typeof path !== 'string') return true
  if (path.trim().length === 0) return true
  if (path && TMP.some(p => p.test(path))) return false
  if (path && PROTECTED.some(p => p.test(path))) return true
  return false
}

function isUnprotectedDir(path) {
  return !isProtectedDir(path)
}

/**
 * Protect critical paths
 * @param {...string} paths - Paths to check
 */
function safeguard(...paths) {
  paths.forEach(path => {
    if (isUnprotectedDir(path)) return
    bus.pub('fail', {file: __file, protectDir: {path}})
    throw new Error(`Path is protected! ${path}`)
  })
}

export {isProtectedDir, isUnprotectedDir, safeguard}
