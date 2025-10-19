import {existsSync} from 'fs'
import {symlink, readlink, rm} from 'fs/promises'
import {relative, dirname} from 'path'

/**
 * Create relative symlink to node_modules with edge case handling
 * Uses relative paths to avoid issues with absolute path resolution in Vite
 * @param {string} target - Target node_modules directory (absolute path)
 * @param {string} link - Symlink path to create (absolute path)
 * @returns {Promise<void>}
 */
export async function linkDependencies(target, link) {
  // Calculate relative path from link location to target
  const relativePath = relative(dirname(link), target)

  // Check if link exists and verify target
  if (existsSync(link)) {
    try {
      const currentTarget = await readlink(link)
      if (currentTarget === relativePath) return // Already correct

      // Stale symlink, remove and recreate
      await rm(link, {force: true})
    } catch {
      // Not a symlink or other error, remove and recreate
      await rm(link, {recursive: true, force: true})
    }
  }

  // Create symlink with relative path
  try {
    await symlink(relativePath, link, 'dir')
  } catch (error) {
    // Windows directory symlinks require admin - use junction instead
    if (process.platform === 'win32' && error.code === 'EPERM') {
      await symlink(relativePath, link, 'junction')
    } else if (error.code === 'EEXIST') {
      // Race condition - another process created it
      // Verify it's correct
      const currentTarget = await readlink(link).catch(() => null)
      if (currentTarget !== relativePath) throw error
    } else {
      throw error
    }
  }
}
