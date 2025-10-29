/**
 * DocFu utilities
 *
 * This module provides utilities for loading DocFu manifest and configuration files.
 */

import {existsSync, readFileSync} from 'fs'
import {join, resolve} from 'path'
import yaml from 'js-yaml'

/**
 * Get sandbox path from environment
 * Set by @lib/base.js during staging
 * @returns {string} Absolute sandbox path
 */
export function getSandbox() {
  if (!process.env.DOCFU_SANDBOX) {
    throw new Error('DOCFU_SANDBOX environment variable not set')
  }
  return process.env.DOCFU_SANDBOX
}

/**
 * Load manifest from sandbox/manifest.json
 * @returns {Object} Manifest object or empty object if not found
 */
export function loadManifest() {
  const sandbox = getSandbox()
  const manifestPath = join(sandbox, 'manifest.json')

  if (!existsSync(manifestPath)) return {}

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}

/**
 * Load config from sandbox/config.yml
 * @returns {Object} Config object or empty object if not found
 */
export function loadConfig() {
  const sandbox = getSandbox()
  const configPath = join(sandbox, 'config.yml')

  if (!existsSync(configPath)) return {}

  try {
    return yaml.load(readFileSync(configPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}
