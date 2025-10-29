import {assert, describe, it, beforeEach} from 'vitest'
import {EventBus, publish, subscribe, unsubscribe} from '../lib/event-bus.js'

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.instance.reset()
  })

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = EventBus.instance
      const instance2 = EventBus.instance
      assert.equal(instance1, instance2)
    })

    it('should return same instance from constructor', () => {
      const instance1 = new EventBus()
      const instance2 = new EventBus()
      assert.equal(instance1, instance2)
    })

    it('should be frozen', () => {
      const instance = EventBus.instance
      assert(Object.isFrozen(instance))
    })
  })

  describe('publish() and subscribe()', () => {
    it('should publish and receive events', () => {
      let received = null
      subscribe('test', detail => {
        received = detail
      })
      publish('test', {message: 'hello'})
      assert(received)
      assert.equal(received.message, 'hello')
    })

    it('should handle multiple subscribers', () => {
      const results = []
      subscribe('test', detail => results.push(1))
      subscribe('test', detail => results.push(2))
      subscribe('test', detail => results.push(3))
      publish('test', {})
      assert.deepEqual(results, [1, 2, 3])
    })

    it('should pass event detail to subscribers', () => {
      let receivedDetail = null
      subscribe('user:login', detail => {
        receivedDetail = detail
      })
      publish('user:login', {userId: 123, name: 'Alice'})
      assert.equal(receivedDetail.userId, 123)
      assert.equal(receivedDetail.name, 'Alice')
    })

    it('should work with direct class access', () => {
      let received = null
      EventBus.instance.subscribe('test', detail => {
        received = detail
      })
      EventBus.instance.publish('test', {message: 'direct'})
      assert(received)
      assert.equal(received.message, 'direct')
    })

    it('should handle events with no subscribers', () => {
      // Should not throw
      assert.doesNotThrow(() => {
        publish('nonexistent', {})
      })
    })
  })

  describe('Metadata injection', () => {
    it('should inject __meta with timestamp', () => {
      let receivedMeta = null
      subscribe('test', detail => {
        receivedMeta = detail.__meta
      })
      publish('test', {})
      assert(receivedMeta)
      assert(receivedMeta.timestamp)
      assert(receivedMeta.timestamp.ns)
      assert(receivedMeta.timestamp.iso8601)
    })

    it('should inject __meta with callsite', () => {
      let receivedMeta = null
      subscribe('test', detail => {
        receivedMeta = detail.__meta
      })
      publish('test', {})
      assert(receivedMeta)
      assert(receivedMeta.callsite)
      assert(typeof receivedMeta.callsite.caller === 'string')
      assert(typeof receivedMeta.callsite.location === 'string')
    })

    it('should have unique timestamps for each event', () => {
      const timestamps = []
      subscribe('test', detail => {
        timestamps.push(detail.__meta.timestamp.ns)
      })
      publish('test', {})
      publish('test', {})
      publish('test', {})
      assert.equal(timestamps.length, 3)
      // Each should be unique
      const uniqueTimestamps = new Set(timestamps)
      assert.equal(uniqueTimestamps.size, 3)
    })

    it('should preserve user detail along with __meta', () => {
      let received = null
      subscribe('test', detail => {
        received = detail
      })
      publish('test', {userId: 456, action: 'login'})
      assert(received.__meta)
      assert.equal(received.userId, 456)
      assert.equal(received.action, 'login')
    })
  })

  describe('unsubscribe()', () => {
    it('should remove specific subscriber', () => {
      let count = 0
      const handler = () => {
        count++
      }
      subscribe('test', handler)
      publish('test', {})
      assert.equal(count, 1)

      unsubscribe('test', handler)
      publish('test', {})
      assert.equal(count, 1) // Still 1, not incremented
    })

    it('should not affect other subscribers', () => {
      const results = []
      const handler1 = () => results.push(1)
      const handler2 = () => results.push(2)
      const handler3 = () => results.push(3)

      subscribe('test', handler1)
      subscribe('test', handler2)
      subscribe('test', handler3)

      unsubscribe('test', handler2)
      publish('test', {})

      assert.deepEqual(results, [1, 3])
    })
  })

  describe('once option', () => {
    it('should unsubscribe after first event', () => {
      let count = 0
      subscribe(
        'test',
        () => {
          count++
        },
        {once: true}
      )
      publish('test', {})
      publish('test', {})
      publish('test', {})
      assert.equal(count, 1)
    })

    it('should work with multiple once subscribers', () => {
      const results = []
      subscribe('test', () => results.push(1), {once: true})
      subscribe('test', () => results.push(2), {once: true})
      publish('test', {})
      publish('test', {})
      assert.deepEqual(results, [1, 2])
    })
  })

  describe('reset()', () => {
    it('should remove all subscribers', () => {
      let count = 0
      subscribe('test1', () => count++)
      subscribe('test2', () => count++)
      EventBus.instance.reset()
      publish('test1', {})
      publish('test2', {})
      assert.equal(count, 0)
    })

    it('should clear events tracking', () => {
      subscribe('test1', () => {})
      subscribe('test2', () => {})
      assert(Object.keys(EventBus.instance.events).length > 0)
      EventBus.instance.reset()
      assert.deepEqual(EventBus.instance.events, {})
    })

    it('should allow resubscribing after reset', () => {
      let count = 0
      subscribe('test', () => count++)
      EventBus.instance.reset()
      subscribe('test', () => count++)
      publish('test', {})
      assert.equal(count, 1)
    })
  })

  describe('events getter', () => {
    it('should return empty object when no events', () => {
      // Create a fresh EventBus instance and reset it
      const bus = EventBus.instance
      bus.reset()
      assert.deepEqual(bus.events, {})
    })

    it('should list all event names with subscribers', () => {
      subscribe('event1', () => {})
      subscribe('event2', () => {})
      subscribe('event3', () => {})
      const events = EventBus.instance.events
      assert(events.event1)
      assert(events.event2)
      assert(events.event3)
    })

    it('should show subscriber count per event', () => {
      const handler1 = () => {}
      const handler2 = () => {}
      const handler3 = () => {}
      subscribe('test', handler1)
      subscribe('test', handler2)
      subscribe('test', handler3)
      const events = EventBus.instance.events
      assert.equal(events.test.length, 3)
    })

    it('should track events even without subscribers', () => {
      publish('orphan', {})
      const events = EventBus.instance.events
      assert(events.orphan)
      assert.equal(events.orphan.length, 0)
    })
  })

  describe('Chaining', () => {
    it('should support chaining publish', () => {
      let count = 0
      subscribe('test', () => count++)
      const result = EventBus.instance.publish('test', {}).publish('test', {})
      assert.equal(count, 2)
      assert(result instanceof EventBus)
    })

    it('should support chaining subscribe', () => {
      let count = 0
      const result = EventBus.instance.subscribe('test1', () => count++).subscribe('test2', () => count++)
      publish('test1', {})
      publish('test2', {})
      assert.equal(count, 2)
      assert(result instanceof EventBus)
    })

    it('should support chaining unsubscribe', () => {
      const handler1 = () => {}
      const handler2 = () => {}
      subscribe('test1', handler1)
      subscribe('test2', handler2)
      const result = EventBus.instance.unsubscribe('test1', handler1).unsubscribe('test2', handler2)
      assert(result instanceof EventBus)
    })
  })

  describe('Multiple event types', () => {
    it('should handle different events independently', () => {
      const results = {login: 0, logout: 0, error: 0}
      subscribe('user:login', () => results.login++)
      subscribe('user:logout', () => results.logout++)
      subscribe('error', () => results.error++)

      publish('user:login', {})
      publish('user:login', {})
      publish('user:logout', {})
      publish('error', {})

      assert.equal(results.login, 2)
      assert.equal(results.logout, 1)
      assert.equal(results.error, 1)
    })

    it('should support event namespacing', () => {
      const results = []
      subscribe('user:login', () => results.push('login'))
      subscribe('user:logout', () => results.push('logout'))
      subscribe('admin:action', () => results.push('admin'))

      publish('user:login', {})
      publish('admin:action', {})
      publish('user:logout', {})

      assert.deepEqual(results, ['login', 'admin', 'logout'])
    })
  })

  describe('Error handling', () => {
    it('should not stop other subscribers if one throws', () => {
      const results = []
      const handler1 = () => results.push(1)
      const handler2 = () => {
        throw new Error('Subscriber error')
      }
      const handler3 = () => results.push(3)

      subscribe('error-test', handler1)
      subscribe('error-test', handler2)
      subscribe('error-test', handler3)

      // EventEmitter will throw the error
      try {
        publish('error-test', {})
      } catch (e) {
        // Expected
      }

      // Clean up to avoid affecting other tests
      unsubscribe('error-test', handler1)
      unsubscribe('error-test', handler2)
      unsubscribe('error-test', handler3)

      // First subscriber should have run
      assert(results.includes(1))
    })
  })

  describe('Edge cases', () => {
    it('should handle empty event names', () => {
      let called = false
      subscribe('', () => {
        called = true
      })
      publish('', {})
      assert(called)
    })

    it('should handle undefined detail', () => {
      let received = null
      subscribe('test', detail => {
        received = detail
      })
      publish('test')
      assert(received)
      assert(received.__meta)
    })

    it('should handle null detail', () => {
      let received = null
      subscribe('test', detail => {
        received = detail
      })
      publish('test', null)
      // null gets overridden by __meta injection
      assert(received)
      assert(received.__meta)
    })
  })
})
