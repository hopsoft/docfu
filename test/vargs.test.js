import {assert, describe, it} from 'vitest'
import {Vargs} from '../lib/vargs.js'

describe('Vargs', () => {
  describe('Factory method', () => {
    it('should create Vargs instance via parse()', () => {
      const result = Vargs.parse('a', 'b')
      assert(result instanceof Vargs, 'Should return Vargs instance')
    })
  })

  describe('Positional arguments only', () => {
    it('should parse single positional argument', () => {
      const {args, kwargs, callback} = Vargs.parse('hello')
      assert.deepEqual(args, ['hello'])
      assert.deepEqual(kwargs, {})
      assert.equal(typeof callback, 'function')
    })

    it('should parse multiple positional arguments', () => {
      const {args, kwargs, callback} = Vargs.parse('a', 'b', 'c')
      assert.deepEqual(args, ['a', 'b', 'c'])
      assert.deepEqual(kwargs, {})
      assert.equal(typeof callback, 'function')
    })
  })

  describe('Kwargs only', () => {
    it('should parse kwargs object', () => {
      const {args, kwargs, callback} = Vargs.parse({foo: 1, bar: 2})
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {foo: 1, bar: 2})
      assert.equal(typeof callback, 'function')
    })

    it('should NOT treat class instances as kwargs', () => {
      class Custom {}
      const instance = new Custom()
      const {args, kwargs} = Vargs.parse(instance)
      assert.deepEqual(args, [instance])
      assert.deepEqual(kwargs, {})
    })

    it('should NOT treat Date as kwargs', () => {
      const date = new Date()
      const {args, kwargs} = Vargs.parse(date)
      assert.deepEqual(args, [date])
      assert.deepEqual(kwargs, {})
    })

    it('should NOT treat Array as kwargs', () => {
      const arr = [1, 2, 3]
      const {args, kwargs} = Vargs.parse(arr)
      assert.deepEqual(args, [arr])
      assert.deepEqual(kwargs, {})
    })
  })

  describe('Callback only', () => {
    it('should parse arrow function callback', () => {
      const fn = () => {}
      const {args, kwargs, callback} = Vargs.parse(fn)
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {})
      assert.equal(callback, fn)
    })

    it('should parse function expression callback', () => {
      const fn = function () {}
      const {args, kwargs, callback} = Vargs.parse(fn)
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {})
      assert.equal(callback, fn)
    })

    it('should parse named function callback', () => {
      function myFunc() {}
      const {args, kwargs, callback} = Vargs.parse(myFunc)
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {})
      assert.equal(callback, myFunc)
    })

    it('should NOT treat class constructor as callback', () => {
      class MyClass {}
      const {args, callback} = Vargs.parse(MyClass)
      assert.deepEqual(args, [MyClass])
      assert.notEqual(callback, MyClass)
    })
  })

  describe('Combined arguments', () => {
    it('should parse positional + callback', () => {
      const fn = () => {}
      const {args, kwargs, callback} = Vargs.parse('a', 'b', fn)
      assert.deepEqual(args, ['a', 'b'])
      assert.deepEqual(kwargs, {})
      assert.equal(callback, fn)
    })

    it('should parse kwargs + callback', () => {
      const fn = () => {}
      const {args, kwargs, callback} = Vargs.parse({foo: 1}, fn)
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {foo: 1})
      assert.equal(callback, fn)
    })

    it('should parse positional + kwargs', () => {
      const {args, kwargs, callback} = Vargs.parse('a', 'b', {foo: 1})
      assert.deepEqual(args, ['a', 'b'])
      assert.deepEqual(kwargs, {foo: 1})
      assert.equal(typeof callback, 'function')
    })

    it('should parse positional + kwargs + callback', () => {
      const fn = () => {}
      const {args, kwargs, callback} = Vargs.parse('a', 'b', {foo: 1}, fn)
      assert.deepEqual(args, ['a', 'b'])
      assert.deepEqual(kwargs, {foo: 1})
      assert.equal(callback, fn)
    })
  })

  describe('Aliases', () => {
    it('should support opts alias for kwargs', () => {
      const {opts} = Vargs.parse({foo: 1})
      assert.deepEqual(opts, {foo: 1})
    })

    it('should support options alias for kwargs', () => {
      const {options} = Vargs.parse({foo: 1})
      assert.deepEqual(options, {foo: 1})
    })

    it('should support config alias for kwargs', () => {
      const {config} = Vargs.parse({foo: 1})
      assert.deepEqual(config, {foo: 1})
    })

    it('should support cb alias for callback', () => {
      const fn = () => {}
      const {cb} = Vargs.parse(fn)
      assert.equal(cb, fn)
    })

    it('should support fn alias for callback', () => {
      const myFn = () => {}
      const {fn} = Vargs.parse(myFn)
      assert.equal(fn, myFn)
    })
  })

  describe('Default values', () => {
    it('should provide empty array when no args', () => {
      const {args} = Vargs.parse()
      assert.deepEqual(args, [])
      // Positional args from spread are mutable (intentional)
      assert.equal(Object.isFrozen(args), false)
    })

    it('should provide frozen empty object when no kwargs', () => {
      const {kwargs} = Vargs.parse()
      assert.deepEqual(kwargs, {})
      assert(Object.isFrozen(kwargs), 'Default kwargs should be frozen')
    })

    it('should provide frozen no-op function when no callback', () => {
      const {callback} = Vargs.parse()
      assert.equal(typeof callback, 'function')
      assert.equal(callback(), undefined)
      assert(Object.isFrozen(callback), 'Default callback should be frozen')
    })

    it('should share frozen defaults for kwargs and callback', () => {
      const result1 = Vargs.parse()
      const result2 = Vargs.parse()
      // Positional args are new arrays each time (mutable)
      assert.notEqual(result1.args, result2.args)
      // But kwargs and callback share frozen defaults
      assert.equal(result1.kwargs, result2.kwargs, 'Should share same frozen empty object')
      assert.equal(result1.callback, result2.callback, 'Should share same frozen no-op')
    })
  })

  describe('Unparsed snapshot', () => {
    it('should preserve original unparsed arguments', () => {
      const fn = () => {}
      const result = Vargs.parse('a', 'b', {foo: 1}, fn)
      assert.deepEqual(result.unparsed, ['a', 'b', {foo: 1}, fn])
    })

    it('should freeze unparsed snapshot', () => {
      const result = Vargs.parse('a', 'b')
      assert(Object.isFrozen(result.unparsed), 'Unparsed should be frozen')
    })
  })

  describe('Mutability', () => {
    it('should allow mutation of args array', () => {
      const {args} = Vargs.parse('a', 'b', 'c')
      args.push('d')
      assert.deepEqual(args, ['a', 'b', 'c', 'd'])
    })

    it('should allow mutation of kwargs object', () => {
      const {kwargs} = Vargs.parse({foo: 1})
      kwargs.bar = 2
      assert.deepEqual(kwargs, {foo: 1, bar: 2})
    })

    it('should allow shift() on args', () => {
      const {args} = Vargs.parse('a', 'b', 'c')
      const first = args.shift()
      assert.equal(first, 'a')
      assert.deepEqual(args, ['b', 'c'])
    })
  })

  describe('Edge cases', () => {
    it('should handle no arguments', () => {
      const {args, kwargs, callback} = Vargs.parse()
      assert.deepEqual(args, [])
      assert.deepEqual(kwargs, {})
      assert.equal(typeof callback, 'function')
    })

    it('should handle null arguments', () => {
      const {args} = Vargs.parse(null, undefined)
      assert.deepEqual(args, [null, undefined])
    })

    it('should handle multiple objects (only last is kwargs)', () => {
      class Custom {}
      const obj1 = new Custom()
      const obj2 = {foo: 1}
      const {args, kwargs} = Vargs.parse(obj1, obj2)
      assert.deepEqual(args, [obj1])
      assert.deepEqual(kwargs, {foo: 1})
    })

    it('should handle multiple functions (only last is callback)', () => {
      const fn1 = () => {}
      const fn2 = () => {}
      const {args, callback} = Vargs.parse(fn1, fn2)
      assert.deepEqual(args, [fn1])
      assert.equal(callback, fn2)
    })
  })

  describe('Real-world usage patterns', () => {
    it('should support destructuring only needed values', () => {
      const {args} = Vargs.parse('a', 'b', {foo: 1}, () => {})
      assert.deepEqual(args, ['a', 'b'])
    })

    it('should support array destructuring of args', () => {
      const {args} = Vargs.parse('first', 'second', 'third')
      const [one, two, ...rest] = args
      assert.equal(one, 'first')
      assert.equal(two, 'second')
      assert.deepEqual(rest, ['third'])
    })

    it('should support object destructuring of kwargs', () => {
      const {kwargs} = Vargs.parse({foo: 1, bar: 2, baz: 3})
      const {foo, bar} = kwargs
      assert.equal(foo, 1)
      assert.equal(bar, 2)
    })

    it('should safely call default callback', () => {
      const {callback} = Vargs.parse('a', 'b')
      assert.doesNotThrow(() => callback())
    })

    it('should work with rest parameters (...inputs)', () => {
      function testMethod(...inputs) {
        return Vargs.parse(...inputs)
      }
      const result = testMethod('a', 'b', {foo: 1}, () => {})
      assert.deepEqual(result.args, ['a', 'b'])
      assert.deepEqual(result.kwargs, {foo: 1})
      assert.equal(typeof result.callback, 'function')
    })

    it('should work with arguments object (...arguments)', () => {
      function testMethod() {
        return Vargs.parse(...arguments)
      }
      const result = testMethod('a', 'b', {foo: 1}, () => {})
      assert.deepEqual(result.args, ['a', 'b'])
      assert.deepEqual(result.kwargs, {foo: 1})
      assert.equal(typeof result.callback, 'function')
    })

    it('should work with arrow functions using rest parameters', () => {
      const testMethod = (...inputs) => Vargs.parse(...inputs)
      const result = testMethod('a', 'b', {foo: 1})
      assert.deepEqual(result.args, ['a', 'b'])
      assert.deepEqual(result.kwargs, {foo: 1})
    })
  })

  describe('Additional type edge cases', () => {
    it('should NOT treat async functions as callbacks', () => {
      const asyncFn = async () => {}
      const {args, callback} = Vargs.parse(asyncFn)
      assert.deepEqual(args, [asyncFn])
      assert.notEqual(callback, asyncFn)
    })

    it('should NOT treat generator functions as callbacks', () => {
      function* generatorFn() {}
      const {args, callback} = Vargs.parse(generatorFn)
      assert.deepEqual(args, [generatorFn])
      assert.notEqual(callback, generatorFn)
    })

    it('should NOT treat async generator functions as callbacks', () => {
      async function* asyncGenFn() {}
      const {args, callback} = Vargs.parse(asyncGenFn)
      assert.deepEqual(args, [asyncGenFn])
      assert.notEqual(callback, asyncGenFn)
    })

    it('should handle Symbol values as positional args', () => {
      const sym = Symbol('test')
      const {args} = Vargs.parse(sym)
      assert.deepEqual(args, [sym])
    })

    it('should handle BigInt values as positional args', () => {
      const bigNum = 123n
      const {args} = Vargs.parse(bigNum)
      assert.deepEqual(args, [bigNum])
    })

    it('should handle empty string as positional arg', () => {
      const {args} = Vargs.parse('')
      assert.deepEqual(args, [''])
    })

    it('should handle false as positional arg', () => {
      const {args} = Vargs.parse(false)
      assert.deepEqual(args, [false])
    })

    it('should handle 0 as positional arg', () => {
      const {args} = Vargs.parse(0)
      assert.deepEqual(args, [0])
    })

    it('should handle RegExp as positional arg', () => {
      const regex = /test/
      const {args} = Vargs.parse(regex)
      assert.deepEqual(args, [regex])
    })

    it('should handle Map as positional arg', () => {
      const map = new Map()
      const {args} = Vargs.parse(map)
      assert.deepEqual(args, [map])
    })

    it('should handle Set as positional arg', () => {
      const set = new Set()
      const {args} = Vargs.parse(set)
      assert.deepEqual(args, [set])
    })

    it('should handle Error as positional arg', () => {
      const error = new Error('test')
      const {args} = Vargs.parse(error)
      assert.deepEqual(args, [error])
    })
  })
})
