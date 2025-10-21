import yaml from 'js-yaml'
import {copyDir, copyFile, dirname, join, mkdir, move, read, realpath, rm} from '../file-system.js'
import base from '../base.js'

export default function build(src, options) {
  base.source = src
  base.sandbox = options.sandbox
}
