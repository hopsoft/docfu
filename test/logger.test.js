import {assert, describe, it, beforeEach, afterEach, vi} from 'vitest'
import {Logger, logger} from '../lib/logger.js'
import {publish} from '../lib/event-bus.js'

describe('Logger', () => {
  let consoleSpy

  beforeEach(() => {
    // Restore all mocks to original implementation first
    vi.restoreAllMocks()

    // Spy on console methods
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    // Restore console methods
    if (consoleSpy) {
      consoleSpy.info?.mockRestore()
      consoleSpy.warn?.mockRestore()
      consoleSpy.error?.mockRestore()
    }
  })

  describe('Singleton pattern', () => {
    it('should return same instance from static getter', () => {
      const instance1 = Logger.instance
      const instance2 = Logger.instance
      assert.equal(instance1, instance2)
    })

    it('should return same instance from constructor', () => {
      const instance1 = new Logger()
      const instance2 = new Logger()
      assert.equal(instance1, instance2)
    })

    it('should return same instance as exported logger', () => {
      assert.equal(Logger.instance, logger)
    })

    it('should be frozen', () => {
      assert(Object.isFrozen(logger))
    })
  })

  describe('Event logging - info level', () => {
    it('should log done events to console.info', () => {
      publish('done', {message: 'test'})
      assert(consoleSpy.info.mock.calls.length > 0)
      assert.equal(consoleSpy.info.mock.calls.length, 1)
    })

    it('should log call events to console.info', () => {
      publish('call', {args: ['test']})
      assert(consoleSpy.info.mock.calls.length > 0)
    })

    it('should log exec events to console.info', () => {
      publish('exec', {command: 'test'})
      assert(consoleSpy.info.mock.calls.length > 0)
    })

    it('should log memo events to console.info', () => {
      publish('memo', {note: 'test'})
      assert(consoleSpy.info.mock.calls.length > 0)
    })

    it('should log omit events to console.info', () => {
      publish('omit', {file: 'test'})
      assert(consoleSpy.info.mock.calls.length > 0)
    })
  })

  describe('Event logging - warn level', () => {
    it('should log miss events to console.warn', () => {
      publish('miss', {item: 'test'})
      assert(consoleSpy.warn.mock.calls.length > 0)
      assert.equal(consoleSpy.warn.mock.calls.length, 1)
    })
  })

  describe('Event logging - error level', () => {
    it('should log deny events to console.error', () => {
      publish('deny', {error: 'test'})
      assert(consoleSpy.error.mock.calls.length > 0)
      assert.equal(consoleSpy.error.mock.calls.length, 1)
    })

    it('should log fail events to console.error', () => {
      publish('fail', {error: 'test'})
      assert(consoleSpy.error.mock.calls.length > 0)
    })
  })

  describe('Log output format', () => {
    it('should include event name in uppercase', () => {
      publish('done', {test: true})
      const call = consoleSpy.info.mock.calls[0]
      const output = call.join(' ')
      assert(output.includes('DONE'))
    })

    it('should include timestamp in output', () => {
      publish('done', {test: true})
      const call = consoleSpy.info.mock.calls[0]
      // First argument should be timestamp tag
      const firstArg = String(call[0])
      // Should contain ISO 8601 timestamp pattern
      assert(firstArg.match(/\d{4}-\d{2}-\d{2}/))
    })

    it('should include callsite caller in output', () => {
      publish('done', {test: true})
      const call = consoleSpy.info.mock.calls[0]
      // Should have multiple tagged arguments before the event message
      assert(call.length >= 2)
    })

    it('should include event detail as JSON', () => {
      publish('done', {userId: 123, action: 'login'})
      const call = consoleSpy.info.mock.calls[0]
      const output = call.join(' ')
      assert(output.includes('userId'))
      assert(output.includes('123'))
      assert(output.includes('action'))
      assert(output.includes('login'))
    })

    it('should not include __meta in JSON output', () => {
      publish('done', {data: 'test'})
      const call = consoleSpy.info.mock.calls[0]
      const lastArg = call[call.length - 1]
      // Last argument is the JSON string with event name and detail
      assert(!lastArg.includes('__meta'))
      assert(!lastArg.includes('timestamp'))
      assert(!lastArg.includes('callsite'))
    })

    it('should handle empty event detail', () => {
      assert.doesNotThrow(() => {
        publish('done')
      })
      assert(consoleSpy.info.mock.calls.length > 0)
      const call = consoleSpy.info.mock.calls[0]
      const lastArg = call[call.length - 1]
      assert(lastArg.includes('DONE'))
    })
  })

  describe('Event type coverage', () => {
    it('should handle all configured event types', () => {
      const events = ['deny', 'call', 'done', 'exec', 'fail', 'memo', 'miss', 'omit']

      events.forEach(event => {
        // Clear previous calls
        consoleSpy.info.mockClear()
        consoleSpy.warn.mockClear()
        consoleSpy.error.mockClear()

        publish(event, {test: event})

        // At least one console method should have been called
        const totalCalls = consoleSpy.info.mock.calls.length + consoleSpy.warn.mock.calls.length + consoleSpy.error.mock.calls.length
        assert.equal(totalCalls, 1, `Event ${event} should trigger exactly one console call`)
      })
    })

    it('should use correct log level for each event type', () => {
      // Clear before this test
      consoleSpy.info.mockClear()
      consoleSpy.warn.mockClear()
      consoleSpy.error.mockClear()

      // Test info level
      publish('done', {})
      assert.equal(consoleSpy.info.mock.calls.length, 1)
      assert.equal(consoleSpy.error.mock.calls.length, 0)
      consoleSpy.info.mockClear()

      // Test warn level
      publish('miss', {})
      assert.equal(consoleSpy.warn.mock.calls.length, 1)
      assert.equal(consoleSpy.info.mock.calls.length, 0)
      consoleSpy.warn.mockClear()

      // Test error level
      publish('deny', {})
      assert.equal(consoleSpy.error.mock.calls.length, 1)
      assert.equal(consoleSpy.info.mock.calls.length, 0)
    })
  })

  describe('Metadata extraction', () => {
    it('should extract and use __meta.timestamp', () => {
      publish('done', {custom: 'data'})
      const call = consoleSpy.info.mock.calls[0]
      // First argument should be the timestamp tag
      const timestampArg = String(call[0])
      assert(timestampArg.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/))
    })

    it('should extract and use __meta.callsite', () => {
      publish('done', {custom: 'data'})
      const call = consoleSpy.info.mock.calls[0]
      // Should have caller and location tags
      assert(call.length >= 3)
    })

    it('should preserve event-specific data after __meta extraction', () => {
      consoleSpy.info.mockClear()
      publish('done', {userId: 789, status: 'active'})
      assert(consoleSpy.info.mock.calls.length > 0, 'Should have at least one console.info call')
      const call = consoleSpy.info.mock.calls[0]
      assert(call && call.length > 0, 'Call should have arguments')
      const lastArg = String(call[call.length - 1])
      assert(lastArg.includes('userId'), `Output should include 'userId': ${lastArg}`)
      assert(lastArg.includes('789'), `Output should include '789': ${lastArg}`)
      assert(lastArg.includes('status'), `Output should include 'status': ${lastArg}`)
      assert(lastArg.includes('active'), `Output should include 'active': ${lastArg}`)
    })
  })

  describe('Multiple events', () => {
    it('should handle multiple events sequentially', () => {
      // Clear before this test
      consoleSpy.info.mockClear()
      consoleSpy.warn.mockClear()
      consoleSpy.error.mockClear()

      publish('done', {first: 1})
      publish('call', {second: 2})
      publish('exec', {third: 3})

      assert.equal(consoleSpy.info.mock.calls.length, 3)
    })

    it('should log each event independently', () => {
      // Clear before this test
      consoleSpy.info.mockClear()
      consoleSpy.warn.mockClear()
      consoleSpy.error.mockClear()

      publish('done', {id: 1})
      publish('miss', {id: 2})
      publish('deny', {id: 3})

      assert.equal(consoleSpy.info.mock.calls.length, 1)
      assert.equal(consoleSpy.warn.mock.calls.length, 1)
      assert.equal(consoleSpy.error.mock.calls.length, 1)
    })
  })
})
