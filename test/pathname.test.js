import {assert, describe, it, beforeEach, afterEach} from 'vitest'
import {Pathname} from '../lib/pathname.js'
import {tmpdir} from 'os'

describe('Pathname', () => {
  let testDir

  beforeEach(() => {
    testDir = new Pathname(tmpdir(), `pathname-test-${Date.now()}`)
    testDir.mkdir()
  })

  afterEach(() => {
    if (testDir.exists) testDir.remove()
  })

  describe('Constructor', () => {
    it('should create Pathname from single string', () => {
      const path = new Pathname('/foo/bar')
      assert.equal(path.toString(), '/foo/bar')
    })

    it('should create Pathname from multiple segments', () => {
      const path = new Pathname('/foo', 'bar', 'baz')
      assert(path.toString().endsWith('foo/bar/baz'))
    })

    it('should accept Pathname instances as arguments', () => {
      const path1 = new Pathname('/foo')
      const path2 = new Pathname(path1, 'bar')
      assert(path2.toString().endsWith('foo/bar'))
    })

    it('should accept multiple Pathname instances as arguments', () => {
      const path1 = new Pathname('/foo')
      const path2 = new Pathname('bar')
      const path3 = new Pathname('baz')
      const combined = new Pathname(path1, path2, path3)
      assert(combined.toString().endsWith('foo/bar/baz'))
    })

    it('should normalize path segments', () => {
      const path = new Pathname('/foo', '../bar', './baz')
      assert(path.toString().includes('bar/baz'))
    })

    it('should handle tilde expansion', () => {
      const path = new Pathname('~', 'docs')
      assert(path.toString().includes('docs'))
      assert(!path.toString().includes('~'))
    })

    it('should handle file:// URLs', () => {
      const path = new Pathname('file:///foo/bar')
      assert(path.toString().includes('/foo/bar'))
      assert(!path.toString().includes('file://'))
    })
  })

  describe('Static from() method', () => {
    it('should create Pathname from string', () => {
      const path = Pathname.from('/foo/bar')
      assert(path instanceof Pathname)
      assert.equal(path.toString(), '/foo/bar')
    })

    it('should return existing Pathname instance unchanged', () => {
      const path1 = new Pathname('/foo/bar')
      const path2 = Pathname.from(path1)
      assert(path2 instanceof Pathname)
      assert.equal(path1, path2)
    })

    it('should handle multiple path segments', () => {
      const path = Pathname.from('/foo', 'bar', 'baz')
      assert(path instanceof Pathname)
      assert(path.toString().endsWith('foo/bar/baz'))
    })
  })

  describe('Getters', () => {
    it('should return parent directory', () => {
      const path = testDir.join('subdir', 'file.txt')
      const parent = path.directory
      assert(parent instanceof Pathname)
      assert(parent.toString().endsWith('subdir'))
    })

    it('should check if path exists', () => {
      const existingPath = testDir
      const missingPath = testDir.join('missing')
      assert.equal(existingPath.exists, true)
      assert.equal(missingPath.exists, false)
    })

    it('should check if path is directory', () => {
      const dirPath = testDir
      const filePath = testDir.join('file.txt')
      filePath.write('test')
      assert.equal(dirPath.isDirectory, true)
      assert.equal(filePath.isDirectory, false)
    })

    it('should check if path is file', () => {
      const dirPath = testDir
      const filePath = testDir.join('file.txt')
      filePath.write('test')
      assert.equal(dirPath.isFile, false)
      assert.equal(filePath.isFile, true)
    })

    it('should check if path is protected', () => {
      const root = new Pathname('/')
      const downloads = new Pathname('~', 'Downloads')
      const tempFile = testDir.join('file.txt')
      assert.equal(root.isProtected, true)
      assert.equal(downloads.isProtected, true)
      assert.equal(tempFile.isProtected, false)
    })

    it('should protect literal tilde paths', () => {
      const tilde = new Pathname('~')
      const tildeSlash = new Pathname('~/')
      assert.equal(tilde.isProtected, true)
      assert.equal(tildeSlash.isProtected, true)
    })

    it('should protect current directory', () => {
      const dot = new Pathname('.')
      const dotSlash = new Pathname('./')
      assert.equal(dot.isProtected, true)
      assert.equal(dotSlash.isProtected, true)
    })

    it('should protect parent directory traversal', () => {
      const dotdot = new Pathname('..')
      const dotdotSlash = new Pathname('../')
      const parent2 = new Pathname('../..')
      const parent3 = new Pathname('../../..')
      const parent2Slash = new Pathname('../../')
      assert.equal(dotdot.isProtected, true)
      assert.equal(dotdotSlash.isProtected, true)
      assert.equal(parent2.isProtected, true)
      assert.equal(parent3.isProtected, true)
      assert.equal(parent2Slash.isProtected, true)
    })

    it('should protect dot directories', () => {
      const git = new Pathname('/foo/bar/.git')
      const npm = new Pathname('/Users/test/.npm')
      assert.equal(git.isProtected, true)
      assert.equal(npm.isProtected, true)
    })

    it('should protect system directories', () => {
      const bin = new Pathname('/bin')
      const etc = new Pathname('/etc')
      const usr = new Pathname('/usr')
      assert.equal(bin.isProtected, true)
      assert.equal(etc.isProtected, true)
      assert.equal(usr.isProtected, true)
    })

    it('should NOT protect allowed temp directories', () => {
      const tmp = new Pathname('/tmp/test-file')
      const docfu = new Pathname(testDir, '.docfu', 'workspace')
      assert.equal(tmp.isProtected, false)
      assert.equal(docfu.isProtected, false)
    })

    it('should protect parent directories of cwd', () => {
      const cwd = process.cwd()
      const parent = cwd.substring(0, cwd.lastIndexOf('/'))
      const parentPath = new Pathname(parent)
      assert.equal(parentPath.isProtected, true)
    })
  })

  describe('basename()', () => {
    it('should return basename of path', () => {
      const path = new Pathname('/foo/bar/baz.txt')
      assert.equal(path.basename(), 'baz.txt')
    })

    it('should return basename without extension', () => {
      const path = new Pathname('/foo/bar/baz.txt')
      assert.equal(path.basename('.txt'), 'baz')
    })
  })

  describe('closest()', () => {
    it('should find closest ancestor containing named file', () => {
      const nested = testDir.join('a', 'b', 'c')
      nested.mkdir()
      testDir.join('package.json').write('{}')

      const result = nested.closest('package.json')
      assert(result instanceof Pathname)
      assert.equal(String(result), String(testDir.join('package.json')))
    })

    it('should find closest ancestor containing named directory', () => {
      const nested = testDir.join('closest-test', 'b', 'c')
      nested.mkdir()
      testDir.join('closest-test', '.git').mkdir()

      const result = nested.closest('.git')
      if (result) {
        assert(result instanceof Pathname)
        assert(result.toString().includes('.git'))
      }
      testDir.join('closest-test').remove()
    })

    it('should return undefined if not found', () => {
      const nested = testDir.join('a', 'b', 'c')
      nested.mkdir()

      const result = nested.closest('nonexistent.txt')
      assert.equal(result, undefined)
    })
  })

  describe('join()', () => {
    it('should join path segments', () => {
      const path = new Pathname('/foo')
      const joined = path.join('bar', 'baz')
      assert(joined instanceof Pathname)
      assert(joined.toString().endsWith('foo/bar/baz'))
    })

    it('should accept Pathname instances', () => {
      const path1 = new Pathname('/foo')
      const path2 = new Pathname('bar')
      const joined = path1.join(path2)
      assert(joined.toString().endsWith('foo/bar'))
    })
  })

  describe('equals()', () => {
    it('should compare paths with string', () => {
      const path = new Pathname('/foo/bar')
      assert.equal(path.equals('/foo/bar'), true)
      assert.equal(path.equals('/foo/baz'), false)
    })

    it('should compare paths with Pathname', () => {
      const path1 = new Pathname('/foo/bar')
      const path2 = new Pathname('/foo/bar')
      const path3 = new Pathname('/foo/baz')
      assert.equal(path1.equals(path2), true)
      assert.equal(path1.equals(path3), false)
    })
  })

  describe('mkdir()', () => {
    it('should create directory', () => {
      const path = testDir.join('newdir')
      const result = path.mkdir()
      assert(result instanceof Pathname)
      assert.equal(result, path, 'Should return this for chaining')
      assert.equal(path.exists, true)
      assert.equal(path.isDirectory, true)
    })

    it('should create nested directories', () => {
      const path = testDir.join('a', 'b', 'c')
      path.mkdir()
      assert.equal(path.exists, true)
      assert.equal(path.isDirectory, true)
    })

    it('should support chaining', () => {
      const path = testDir.join('chaindir').mkdir()
      assert(path instanceof Pathname)
      assert.equal(path.exists, true)
    })
  })

  describe('write() and read()', () => {
    it('should write and read file', () => {
      const path = testDir.join('test.txt')
      path.write('hello world')
      assert.equal(path.exists, true)
      assert.equal(path.read(), 'hello world')
    })

    it('should create parent directories when writing', () => {
      const path = testDir.join('nested', 'dir', 'file.txt')
      path.write('content')
      assert.equal(path.exists, true)
      assert.equal(path.read(), 'content')
    })

    it('should overwrite existing file', () => {
      const path = testDir.join('file.txt')
      path.write('first')
      path.write('second')
      assert.equal(path.read(), 'second')
    })

    it('should read directory contents', () => {
      testDir.join('file1.txt').write('test')
      testDir.join('file2.txt').write('test')
      const contents = testDir.read()
      assert(Array.isArray(contents))
      assert(contents.includes('file1.txt'))
      assert(contents.includes('file2.txt'))
    })
  })

  describe('copy()', () => {
    it('should copy file to destination', () => {
      const source = testDir.join('source.txt')
      const dest = testDir.join('dest.txt')
      source.write('content')
      const result = source.copy(dest)
      assert(result instanceof Pathname)
      assert.equal(dest.exists, true)
      assert.equal(dest.read(), 'content')
    })

    it('should copy to Pathname instance', () => {
      const source = testDir.join('source.txt')
      const dest = testDir.join('dest.txt')
      source.write('content')
      const result = source.copy(dest)
      assert(result instanceof Pathname)
      assert.equal(result.read(), 'content')
    })

    it('should copy directory recursively', () => {
      const sourceDir = testDir.join('source')
      sourceDir.mkdir()
      sourceDir.join('file.txt').write('test')
      sourceDir.join('nested').mkdir()
      sourceDir.join('nested', 'file2.txt').write('test2')

      const destDir = testDir.join('dest')
      const result = sourceDir.copy(destDir)
      assert(result instanceof Pathname)
      assert.equal(destDir.exists, true)
      assert.equal(destDir.isDirectory, true)
      assert.equal(destDir.join('file.txt').read(), 'test')
      assert.equal(destDir.join('nested', 'file2.txt').read(), 'test2')
    })
  })

  describe('move()', () => {
    it('should move file to destination', () => {
      const source = testDir.join('source.txt')
      const dest = testDir.join('dest.txt')
      source.write('content')
      const result = source.move(dest)
      assert(result instanceof Pathname)
      assert.equal(source.exists, false)
      assert.equal(dest.exists, true)
      assert.equal(dest.read(), 'content')
    })

    it('should move to Pathname instance', () => {
      const source = testDir.join('source.txt')
      const dest = testDir.join('dest.txt')
      source.write('content')
      const result = source.move(dest)
      assert(result instanceof Pathname)
      assert.equal(result.read(), 'content')
    })
  })

  describe('remove()', () => {
    it('should remove file', () => {
      const path = testDir.join('test.txt')
      path.write('content')
      assert.equal(path.exists, true)
      const result = path.remove()
      assert.equal(result, path, 'Should return this for chaining')
      assert.equal(path.exists, false)
    })

    it('should remove directory with contents', () => {
      const dir = testDir.join('dir')
      dir.mkdir()
      dir.join('file.txt').write('test')
      dir.join('nested').mkdir()
      dir.join('nested', 'file2.txt').write('test2')

      dir.remove()
      assert.equal(dir.exists, false)
    })

    it('should support chaining with mkdir and remove', () => {
      const path = testDir.join('chaintest').mkdir().remove()
      assert.equal(path.exists, false)
    })
  })

  describe('stat()', () => {
    it('should return fs.Stats for existing path', () => {
      const path = testDir
      const stats = path.stat()
      assert(stats)
      assert.equal(typeof stats.isDirectory, 'function')
    })

    it('should return undefined for non-existent path', () => {
      const path = testDir.join('missing')
      const stats = path.stat()
      assert.equal(stats, undefined)
    })
  })

  describe('Type coercion', () => {
    it('should convert to string with toString()', () => {
      const path = new Pathname('/foo/bar')
      assert.equal(path.toString(), '/foo/bar')
      assert.equal(String(path), '/foo/bar')
    })

    it('should convert to string with valueOf()', () => {
      const path = new Pathname('/foo/bar')
      assert.equal(path.valueOf(), '/foo/bar')
    })

    it('should support template literals', () => {
      const path = new Pathname('/foo/bar')
      assert.equal(`${path}`, '/foo/bar')
    })

    it('should support string concatenation', () => {
      const path = new Pathname('/foo')
      assert.equal('' + path, '/foo')
    })
  })

  describe('Custom inspect', () => {
    it('should provide custom inspect output', () => {
      const path = testDir
      const inspected = path[Symbol.for('nodejs.util.inspect.custom')]()
      assert(inspected.includes('Pathname'))
      assert(inspected.includes(testDir.toString()))
      assert(inspected.includes('exists: true'))
    })

    it('should show exists: false for missing path', () => {
      const path = testDir.join('missing')
      const inspected = path[Symbol.for('nodejs.util.inspect.custom')]()
      assert(inspected.includes('exists: false'))
    })
  })

  describe('matches()', () => {
    it('should match glob patterns', () => {
      const path = new Pathname('/foo/bar/test.txt')
      assert.equal(path.matches('**/test.txt'), true)
      assert.equal(path.matches('**/bar/*.txt'), true)
      assert.equal(path.matches('*.txt'), false) // not in root
      assert.equal(path.matches('*.js'), false)
    })

    it('should match multiple patterns (variadic)', () => {
      const path = new Pathname('/foo/bar/test.txt')
      assert.equal(path.matches('*.js', '*.md', '**/test.txt'), true)
      assert.equal(path.matches('*.js', '*.md'), false)
    })
  })

  describe('glob()', () => {
    it('should find files matching pattern', () => {
      testDir.join('file1.txt').write('test')
      testDir.join('file2.txt').write('test')
      testDir.join('file3.js').write('test')

      const matches = testDir.glob('*.txt')
      assert.equal(matches.length, 2)
      assert(matches.some(m => m.includes('file1.txt')))
      assert(matches.some(m => m.includes('file2.txt')))
    })

    it('should find nested files', () => {
      const nestedDir = testDir.join('nested-glob-test')
      nestedDir.mkdir()
      nestedDir.join('a').mkdir()
      nestedDir.join('a', 'file1.txt').write('test')
      nestedDir.join('a', 'b').mkdir()
      nestedDir.join('a', 'b', 'file2.txt').write('test')

      const matches = nestedDir.glob('**/*.txt')
      assert.equal(matches.length, 2)
      nestedDir.remove()
    })

    it('should return empty array when no matches', () => {
      const matches = testDir.glob('*.nonexistent')
      assert(Array.isArray(matches))
      assert.equal(matches.length, 0)
    })
  })

  describe('relative()', () => {
    it('should compute relative path to another path', () => {
      const from = new Pathname('/foo/bar')
      const to = '/foo/baz'
      const rel = from.relative(to)
      assert.equal(rel, '../baz')
    })

    it('should accept Pathname as argument', () => {
      const from = new Pathname('/foo/bar')
      const to = new Pathname('/foo/baz')
      const rel = from.relative(to)
      assert.equal(rel, '../baz')
    })
  })

  describe('Method chaining', () => {
    it('should chain mkdir and write operations', () => {
      const path = testDir.join('newdir').mkdir()
      const file = path.join('file.txt')
      file.write('test')
      assert.equal(path.isDirectory, true)
      assert.equal(file.read(), 'test')
    })

    it('should chain copy and modify operations', () => {
      const source = testDir.join('source.txt')
      source.write('original')
      const dest = source.copy(testDir.join('dest.txt'))
      dest.write('modified')
      assert.equal(source.read(), 'original')
      assert.equal(dest.read(), 'modified')
    })

    it('should chain complex operations', () => {
      const dir = testDir.join('complex').mkdir()
      const file = dir.join('file.txt')
      file.write('content')
      const backup = file.copy(dir.join('backup.txt'))
      assert.equal(dir.isDirectory, true)
      assert.equal(file.read(), 'content')
      assert.equal(backup.read(), 'content')
    })
  })
})
