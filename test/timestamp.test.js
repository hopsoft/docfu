import {assert, describe, it} from 'vitest'
import {Timestamp} from '../lib/timestamp.js'

describe('Timestamp', () => {
  describe('Constructor', () => {
    it('should create timestamp with current time', () => {
      const ts = new Timestamp()
      assert(ts.ns > 0n)
      assert(ts.us > 0)
      assert(ts.iso8601)
    })

    it('should create unique timestamps', () => {
      const ts1 = new Timestamp()
      const ts2 = new Timestamp()
      assert(ts2.ns > ts1.ns, 'Second timestamp should be later')
    })
  })

  describe('ns getter', () => {
    it('should return BigInt nanoseconds', () => {
      const ts = new Timestamp()
      assert.equal(typeof ts.ns, 'bigint')
      assert(ts.ns > 0n)
    })

    it('should be monotonic (always increasing)', () => {
      const ts1 = new Timestamp()
      const ts2 = new Timestamp()
      const ts3 = new Timestamp()
      assert(ts2.ns > ts1.ns)
      assert(ts3.ns > ts2.ns)
    })
  })

  describe('us getter', () => {
    it('should return number microseconds', () => {
      const ts = new Timestamp()
      assert.equal(typeof ts.us, 'number')
      assert(ts.us > 0)
    })

    it('should be approximately 1000x smaller than nanoseconds', () => {
      const ts = new Timestamp()
      const usFromNs = Number(ts.ns / 1000n)
      assert.equal(ts.us, usFromNs)
    })
  })

  describe('elapsed getter', () => {
    it('should return elapsed time since first Timestamp', () => {
      const ts1 = new Timestamp()
      const elapsed1 = ts1.elapsed
      assert(elapsed1 >= 0n, 'First timestamp should have non-negative elapsed')

      const ts2 = new Timestamp()
      const elapsed2 = ts2.elapsed
      assert(elapsed2 > elapsed1, 'Later timestamp should have greater elapsed')
    })

    it('should increase over time', async () => {
      const ts1 = new Timestamp()
      await new Promise(resolve => setTimeout(resolve, 10))
      const ts2 = new Timestamp()
      assert(ts2.elapsed > ts1.elapsed)
    })
  })

  describe('iso8601 getter', () => {
    it('should return ISO 8601 formatted string', () => {
      const ts = new Timestamp()
      const iso = ts.iso8601
      assert(typeof iso === 'string')
      assert(iso.endsWith('Z'))
    })

    it('should match ISO 8601 format with microseconds', () => {
      const ts = new Timestamp()
      const iso = ts.iso8601
      // Format: YYYY-MM-DDTHH:mm:ss.SSSSSSZ (microseconds)
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/
      assert(isoPattern.test(iso), `ISO format should match pattern: ${iso}`)
    })

    it('should have microsecond precision (6 digits after decimal)', () => {
      const ts = new Timestamp()
      const iso = ts.iso8601
      const parts = iso.split('.')
      assert.equal(parts.length, 2)
      const microseconds = parts[1].replace('Z', '')
      assert.equal(microseconds.length, 6)
    })

    it('should be parseable as valid date', () => {
      const ts = new Timestamp()
      const iso = ts.iso8601
      const date = new Date(iso)
      assert(!isNaN(date.getTime()), 'ISO string should parse to valid date')
    })

    it('should have increasing ISO timestamps', () => {
      const ts1 = new Timestamp()
      const ts2 = new Timestamp()
      const ts3 = new Timestamp()
      assert(ts2.iso8601 >= ts1.iso8601)
      assert(ts3.iso8601 >= ts2.iso8601)
    })
  })

  describe('Time relationships', () => {
    it('should maintain consistent time across all getters', () => {
      const ts = new Timestamp()

      // ns and us should be related
      const expectedUs = Number(ts.ns / 1000n)
      assert.equal(ts.us, expectedUs)

      // ISO timestamp should be parseable as valid Date
      const date = new Date(ts.iso8601)
      assert(!isNaN(date.getTime()), 'ISO should parse to valid date')

      // ISO should represent approximately current time
      const now = Date.now()
      const isoMs = date.getTime()
      const diff = Math.abs(now - isoMs)
      assert(diff < 1000, 'ISO date should be within 1 second of current time')
    })
  })

  describe('Multiple instances', () => {
    it('should create multiple independent timestamps', () => {
      const timestamps = Array.from({length: 10}, () => new Timestamp())

      // Each should have unique values
      const nsValues = timestamps.map(t => t.ns)
      const uniqueNs = new Set(nsValues)
      assert.equal(uniqueNs.size, timestamps.length, 'All ns values should be unique')

      // Should be monotonically increasing
      for (let i = 1; i < timestamps.length; i++) {
        assert(timestamps[i].ns > timestamps[i - 1].ns)
      }
    })

    it('should have consistent elapsed ordering', () => {
      const ts1 = new Timestamp()
      const ts2 = new Timestamp()
      const ts3 = new Timestamp()

      assert(ts1.elapsed <= ts2.elapsed)
      assert(ts2.elapsed <= ts3.elapsed)
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid successive creation', () => {
      const timestamps = []
      for (let i = 0; i < 100; i++) {
        timestamps.push(new Timestamp())
      }

      // All should be unique (nanosecond precision should ensure this)
      const nsValues = timestamps.map(t => t.ns)
      const uniqueNs = new Set(nsValues)
      assert.equal(uniqueNs.size, timestamps.length)
    })

    it('should pad microseconds with leading zeros', () => {
      // Create many timestamps to increase chance of getting small microsecond values
      const timestamps = Array.from({length: 100}, () => new Timestamp())
      const isos = timestamps.map(t => t.iso8601)

      // All should have exactly 6 digits for microseconds
      for (const iso of isos) {
        const parts = iso.split('.')
        const microseconds = parts[1].replace('Z', '')
        assert.equal(microseconds.length, 6, `Microseconds should always be 6 digits: ${iso}`)
      }
    })
  })
})
