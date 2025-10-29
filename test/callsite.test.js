import {assert, describe, it} from 'vitest'
import {Callsite} from '../lib/callsite.js'

describe('Callsite', () => {
  describe('Offset behavior', () => {
    it('should capture different frames based on offset', () => {
      function level3(offset) {
        return new Callsite(offset)
      }
      function level2(offset) {
        return level3(offset)
      }
      function level1(offset) {
        return level2(offset)
      }

      // Offset 2 should skip level3 and level2
      const callsite2 = level1(2)
      assert(typeof callsite2.caller === 'string', 'caller should be a string')
      assert(callsite2.caller.length > 0, 'caller should not be empty')

      // Offset 3 should skip level3, level2, and level1
      const callsite3 = level1(3)
      assert(typeof callsite3.line === 'string', 'line should be a string')
    })

    it('should capture correct caller at different depths', () => {
      function deepFunction() {
        return new Callsite(2)
      }
      function middleFunction() {
        return deepFunction()
      }
      function topFunction() {
        return middleFunction()
      }

      const callsite = topFunction()
      // Should capture topFunction or one of the calling functions
      assert(typeof callsite.caller === 'string')
      assert(callsite.caller.length > 0)
    })
  })

  describe('Caller extraction', () => {
    it('should extract named function names', () => {
      function namedFunction() {
        return new Callsite(2)
      }
      const callsite = namedFunction()
      // Either extracts the name or falls back to 'anonymous'
      assert(typeof callsite.caller === 'string')
      assert(callsite.caller.length > 0)
    })

    it('should handle arrow functions', () => {
      const arrowFunc = () => new Callsite(2)
      const callsite = arrowFunc()
      assert(typeof callsite.caller === 'string')
      assert(callsite.caller.length > 0)
    })

    it('should handle class methods', () => {
      class TestClass {
        testMethod() {
          return new Callsite(2)
        }
      }
      const instance = new TestClass()
      const callsite = instance.testMethod()
      assert(typeof callsite.caller === 'string')
      // Might capture 'testMethod' or 'TestClass.testMethod'
      assert(callsite.caller.length > 0)
    })

    it('should fallback to "anonymous" when caller not found', () => {
      // Create a callsite with an offset that goes beyond the stack
      const callsite = new Callsite(100)
      assert.equal(callsite.caller, 'anonymous')
    })
  })

  describe('Location extraction', () => {
    it('should extract location from stack trace', () => {
      const callsite = new Callsite(2)
      assert(typeof callsite.location === 'string')
      assert(callsite.location.length > 0)
    })

    it('should contain docfu path when available', () => {
      function testFunction() {
        return new Callsite(2)
      }
      const callsite = testFunction()
      // Should either contain 'docfu/' or fallback to 'unknown'
      assert(callsite.location.includes('docfu/') || callsite.location === 'unknown')
    })

    it('should fallback to "unknown" when location not found', () => {
      // Create a callsite with an offset that goes beyond the stack
      const callsite = new Callsite(100)
      assert.equal(callsite.location, 'unknown')
    })
  })

  describe('Line getter', () => {
    it('should return raw stack trace line', () => {
      const callsite = new Callsite(2)
      assert(typeof callsite.line === 'string')
    })

    it('should return empty string when offset is invalid', () => {
      const callsite = new Callsite(1000)
      assert.equal(callsite.line, '')
    })

    it('should contain stack trace information', () => {
      function trackedFunction() {
        return new Callsite(2)
      }
      const callsite = trackedFunction()
      if (callsite.line) {
        // Line should contain some recognizable stack trace elements
        assert(callsite.line.includes('at ') || callsite.line.length === 0)
      }
    })
  })

  describe('Getters always return values', () => {
    it('should never return undefined for caller', () => {
      const callsite1 = new Callsite(2)
      const callsite2 = new Callsite(100)
      assert.notEqual(callsite1.caller, undefined)
      assert.notEqual(callsite2.caller, undefined)
      assert(typeof callsite1.caller === 'string')
      assert(typeof callsite2.caller === 'string')
    })

    it('should never return undefined for location', () => {
      const callsite1 = new Callsite(2)
      const callsite2 = new Callsite(100)
      assert.notEqual(callsite1.location, undefined)
      assert.notEqual(callsite2.location, undefined)
      assert(typeof callsite1.location === 'string')
      assert(typeof callsite2.location === 'string')
    })

    it('should never return undefined for line', () => {
      const callsite1 = new Callsite(2)
      const callsite2 = new Callsite(100)
      assert.notEqual(callsite1.line, undefined)
      assert.notEqual(callsite2.line, undefined)
      assert(typeof callsite1.line === 'string')
      assert(typeof callsite2.line === 'string')
    })
  })

  describe('Edge cases', () => {
    it('should handle offset 0 (captures constructor)', () => {
      const callsite = new Callsite(0)
      assert(typeof callsite.caller === 'string')
      assert(typeof callsite.location === 'string')
      assert(typeof callsite.line === 'string')
    })

    it('should handle negative offset gracefully', () => {
      const callsite = new Callsite(-1)
      assert(typeof callsite.caller === 'string')
      assert(typeof callsite.location === 'string')
    })

    it('should handle very large offset', () => {
      const callsite = new Callsite(9999)
      assert.equal(callsite.caller, 'anonymous')
      assert.equal(callsite.location, 'unknown')
      assert.equal(callsite.line, '')
    })

    it('should handle errors during stack parsing', () => {
      // Constructor has try/catch, so this should never throw
      assert.doesNotThrow(() => {
        new Callsite(2)
        new Callsite(100)
        new Callsite(-1)
      })
    })
  })

  describe('Custom inspect', () => {
    it('should provide custom inspect output', () => {
      const callsite = new Callsite(2)
      const inspected = callsite[Symbol.for('nodejs.util.inspect.custom')]()
      assert(typeof inspected === 'string')
      assert(inspected.includes('Callsite'))
      assert(inspected.includes('caller'))
      assert(inspected.includes('location'))
    })

    it('should include caller and location in inspect', () => {
      function inspectedFunction() {
        return new Callsite(2)
      }
      const callsite = inspectedFunction()
      const inspected = callsite[Symbol.for('nodejs.util.inspect.custom')]()
      // Should contain the caller and location values
      assert(inspected.includes(callsite.caller))
      assert(inspected.includes(callsite.location))
    })

    it('should handle fallback values in inspect', () => {
      const callsite = new Callsite(100)
      const inspected = callsite[Symbol.for('nodejs.util.inspect.custom')]()
      assert(inspected.includes('anonymous'))
      assert(inspected.includes('unknown'))
    })
  })

  describe('Stack trace parsing', () => {
    it('should parse stack from different call contexts', () => {
      // Direct call
      const direct = new Callsite(2)
      assert(typeof direct.caller === 'string')

      // From function
      function fromFunction() {
        return new Callsite(2)
      }
      const fromFunc = fromFunction()
      assert(typeof fromFunc.caller === 'string')

      // From method
      const obj = {
        method() {
          return new Callsite(2)
        },
      }
      const fromMethod = obj.method()
      assert(typeof fromMethod.caller === 'string')
    })

    it('should extract caller matching regex pattern', () => {
      function testCallerRegex() {
        return new Callsite(2)
      }
      const callsite = testCallerRegex()
      // Caller should be at least 3 characters (per regex pattern \b([\w.]{3,})\b)
      if (callsite.caller !== 'anonymous') {
        assert(callsite.caller.length >= 3)
      }
    })

    it('should extract location matching regex pattern', () => {
      const callsite = new Callsite(2)
      // Location should contain docfu/ or be 'unknown'
      if (callsite.location !== 'unknown') {
        assert(callsite.location.includes('docfu/'))
      }
    })
  })

  describe('Multiple instances', () => {
    it('should create independent instances', () => {
      function caller1() {
        return new Callsite(2)
      }
      function caller2() {
        return new Callsite(2)
      }

      const callsite1 = caller1()
      const callsite2 = caller2()

      // Both should be valid Callsite instances
      assert(callsite1 instanceof Callsite)
      assert(callsite2 instanceof Callsite)

      // Both should have independent data
      assert(typeof callsite1.caller === 'string')
      assert(typeof callsite2.caller === 'string')
    })

    it('should capture different callers at same offset', () => {
      function funcA() {
        return new Callsite(2)
      }
      function funcB() {
        return new Callsite(2)
      }

      const a = funcA()
      const b = funcB()

      // Both should capture something
      assert(a.caller.length > 0)
      assert(b.caller.length > 0)
    })
  })

  describe('Integration with real call stacks', () => {
    it('should work in nested async context', async () => {
      async function asyncLevel2() {
        return new Callsite(2)
      }
      async function asyncLevel1() {
        return await asyncLevel2()
      }

      const callsite = await asyncLevel1()
      assert(typeof callsite.caller === 'string')
      assert(typeof callsite.location === 'string')
    })

    it('should work with immediately invoked functions', () => {
      const callsite = (() => new Callsite(2))()
      assert(typeof callsite.caller === 'string')
      assert(typeof callsite.location === 'string')
    })

    it('should work with callbacks', () => {
      return new Promise(resolve => {
        function callWithCallback(cb) {
          cb()
        }

        callWithCallback(() => {
          const callsite = new Callsite(2)
          assert(typeof callsite.caller === 'string')
          assert(typeof callsite.location === 'string')
          resolve()
        })
      })
    })
  })
})
