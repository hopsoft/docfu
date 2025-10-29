import {existsSync} from 'fs'
import {symlink, readlink, rm} from 'fs/promises'

/**
 * Create symlink to node_modules with edge case handling
 * Handles Windows EPERM (uses junction), stale symlinks, and race conditions
 * @param {string} target - Target node_modules directory
 * @param {string} link - Symlink path to create
 * @returns {Promise<void>}
 */
export async function createNodeModulesLink(target, link) {
  if (existsSync(link)) {
    try {
      const currentTarget = await readlink(link)
      if (currentTarget === target) return // already correct
      await rm(link, {force: true}) // remove stale link
    } catch {
      await rm(link, {recursive: true, force: true}) // remove invalid link
    }
  }

  try {
    await symlink(target, link, 'dir')
  } catch (error) {
    // Windows directory symlinks require admin - use junction instead
    if (process.platform === 'win32' && error.code === 'EPERM') {
      await symlink(target, link, 'junction')
    } else if (error.code === 'EEXIST') {
      // Race condition - another process created it, verify it's correct
      const currentTarget = await readlink(link).catch(() => null)
      if (currentTarget !== target) throw error
    } else {
      throw error
    }
  }
}
