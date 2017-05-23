
const assert = require('assert')
const sinon = require('sinon')
const t = require('transducers-js')

const { cancel, merge, sleep, chan, go, put, take, clone, close, CLOSED, any } = require('../build/index')

describe('channels', () => {

  describe('take()', () => {

    it ('should return a promise', () => {
      assert(put(chan()) instanceof Promise)
    })

    it ('should by implied by simply awaiting a channel', (cb) => {
      go(async () => {
        let ch = chan()
        put(ch, 1)
        let val = await ch
        assert.equal(val, 1)
      }).then(cb)
    })

    it ('should deliver oldest put value', (cb) => {

      var ch = chan()
      put(ch, 1)
      put(ch, 2)

      var expected;

      take(ch).then((val) => expected = val)

      setTimeout(() => {
        assert.equal(expected, 1)
        cb()
      }, 100)
    })

    it ('should work in async function', (cb) => {

      var ch = chan()
      put(ch, 1)
      put(ch, 2)

      var test = async function() {
        var val = await take(ch)
        assert(val === 1)
        cb()
      }

      test()
    })

    it ('should work in a go-block', (cb) => {

      var ch = chan()
      put(ch, 1)
      put(ch, 2)

      go(async function() {
        var val = await take(ch)
        assert(val === 1)
        cb()
      })
    })

    it ('should park and wait if no pending put value', (cb) => {

      var ch = chan()
      var spy = sinon.spy()

      go(async function() {
        val = await take(ch)
        spy()
      })

      process.nextTick(() => {
        assert(!spy.called)
        cb()
      })
    })
  })

  describe('put()', () => {

    it ('should return a promise', () => {
      assert(put(chan()) instanceof Promise)
    })

    it ('should allow transducer to modify content', (cb) => {
      var ch = chan(null, t.map((n) => n + 1))
      take(ch)
        .then((val) => assert(val === 2))
        .then(cb)
      put(ch, 1)
    })

    it ('should drop the put if transducer filters it out', (cb) => {
      var ch = chan(null, t.filter((n) => n > 1))
      take(ch)
        .then((val) => assert(val === 2))
        .then(cb)
      put(ch, 1) // dropped
      put(ch, 2)
    })

    it ('should delegate to buffer', () => {
      var ch = chan()
      var spy = sinon.spy(ch.buffer, 'push')
      put(ch, 1)
      assert(spy.calledOnce)
    })

    it ('should resolve put immediately if there is a pending take', () => {

      var ch = chan()
      var spy = sinon.spy(ch.buffer, 'push')

      // pending take
      take(ch)

      // put will be executed, not queued
      put(ch, 1)

      assert(!spy.called)
    })
  })

  describe('sleep()', () => {
    it ('should sleep for given ms', (cb) => {

      var ch = chan()
      var subject = 1

      go(async function() {
        await sleep(100)
        subject = 2
      })

      setTimeout(() => {
        assert(subject === 1)
        setTimeout(() => {
          assert(subject === 2)
          cb()
        }, 60)
      }, 60)

    })
  })

  describe('clone()', () => {

    it ('should create a new chan with the same properties', () => {
      var bufferOrN = 1
      var xduce = t.map((n) => n + 1)
      var opts = { foo: 'bar' }
      var a = chan(bufferOrN, xduce, opts)
      var b = clone(a, null, { debug: true })
      assert.equal(JSON.stringify(a), JSON.stringify(b))
    })
  })

  describe('close()', () => {

    it ('should set channel closed property to true', () => {
      var ch = chan()
      assert(!ch.isClosed)
      close(ch)
      assert(ch.isClosed)
    })

    it ('should cause all puts to resolve to false immediately', (cb) => {
      var ch = chan()
      close(ch)
      put(ch, 2)
        .then((val) => assert(val === false))
        .then(cb)
    })

    it ('should cause all takes to resolve with CLOSED constant value immediately', (cb) => {
      var ch = chan()
      close(ch)
      take(ch, 2)
        .then((val) => assert(val === CLOSED))
        .then(cb)
    })

    it ('should cause all pending takes to resolve with CLOSED constant immediately', (cb) => {
      var ch = chan()
      var takenA = take(ch)
      var takenB = take(ch)
      close(ch)
      takenA.then((val) => assert(val === CLOSED))
      takenB.then((val) => assert(val === CLOSED))
      Promise.all([ takenA, takenB ]).then(() => cb())
    })

    it ('should cause all pending puts in buffer to resolve with false immediately', (cb) => {
      var ch = chan()
      var putted = put(ch, 2)
      close(ch)
      putted
        .then((val) => assert(val === false))
        .then(cb)
    })
  })

  describe('alts()', () => {

    it ('should resolve with first action that resolves', (cb) => {
      go(async () => {
        var ch1 = chan()
        var p = sleep(100)
        var [ v, ch ] = await any(ch1, p)
        assert.equal(ch, p)
      }).then(cb, cb)
    })

    it ('should resolve immediately if a take has a pending put', (cb) => {
      go(async () => {
        var ch1 = chan()
        var ch2 = chan()
        var p = sleep(1000)
        put(ch2, 1)
        var [ v, ch ] = await any(ch1, ch2, p)
        assert.equal(ch, ch2)
        assert.equal(v, 1)
      }).then(cb)
    })

    it ('should resolve non-deterministically when more than one has a pending put', (cb) => {
      go(async () => {
        var resolved = []
        for (var i = 0; i < 100; i++) {
          var chans = [ chan(), chan(), chan() ]
          put(chans[1], 1)
          put(chans[2], 2)
          var [ val, ch ] = await any(...chans)
          resolved.push(chans.indexOf(ch))
        }
        assert.ok(resolved.some((r) => r === 1))
        assert.ok(!resolved.every((r) => r === 1))
      }).then(cb)
    })

    it ('should cancel all other channel actions after one is resolved', (cb) => {
      go(async () => {

        var ch1 = chan()
        var ch2 = chan()
        var p = sleep(1000)

        put(ch1, 1)
        await any(ch1, ch2, p)

        put(ch2, 2)
        let v = await take(ch2)

        assert.equal(v, 2)
      }).then(cb)
    })

    it ('should work with takes and puts - put winning', (cb) => {
      go(async () => {

        var ch1 = chan()
        var ch2 = chan()

        setTimeout(() => take(ch2), 50)
        
        let [ v, ch ] = await any(ch1, [ ch2, 1 ])
        
        assert.equal(v, 1)
        assert.equal(ch, ch2)

      }).then(cb, cb)
    })

    it ('should work with takes and puts - take winning', (cb) => {

      go(async () => {

        let ch1 = chan()
        let ch2 = chan()
        let ch3 = chan()
        let p = sleep(100)

        setTimeout(() => put(ch2, 2), 50)
        
        let [ v, ch ] = await any(ch1, ch2, p, [ ch3, 1 ])
        
        assert.equal(v, 2)
        assert.equal(ch, ch2)

      }).then(cb, cb)
    })

    it ('should work with raw promises - promise winning', (cb) => {

      go(async () => {

        let ch1 = chan()
        let ch2 = chan()
        let p = Promise.resolve(3)
        
        let [ v, ch ] = await any(ch1, [ ch2, 1 ], p)
        
        assert.equal(v, 3)
        assert.equal(ch, p)

      }).then(cb, cb)
    })

    it ('should work for typical "timeout" effect', (cb) => {

      go(async () => {

        let input = chan()
        let timeout = sleep(100)

        let [ v, ch ] = await any(input, timeout)

        assert.equal(ch, timeout)
        
      }).then(cb, cb)
    })

    it ('should work for typical "timeout" effect - in time', (cb) => {

      go(async () => {

        let input = chan()
        let timeout = sleep(100)

        setTimeout(() => put(input, 1), 50)

        let [ v, ch ] = await any(input, timeout)

        assert.equal(ch, input)
        
      }).then(cb, cb)
    })
  })

  describe('cancel()', () => {

    describe('canceling a put', () => {

      it ('should remove it from the buffer\'s unreleased queue', (cb) => {
        let ch = chan()
        go(async () => {
          let put1Promise = put(ch, 1)
          let put2Promise = put(ch, 2)
          cancel(ch, put1Promise)
          let val = await take(ch)
          assert.equal(val, 2)
        }).then(cb)
      })
    })

    describe('canceling a take', () => {

      it ('should remove it from the channel\'s takes', (cb) => {
        let ch = chan()
        go(async () => {
          let take1Promise = take(ch)
          let take2Promise = take(ch)
          cancel(ch, take1Promise)
          put(ch, 2)
          let val = await take2Promise
          assert.equal(val, 2)
        }).then(cb)
      })
    })
  })

  describe('go()', () => {
    it ('should immediately invoke given function', () => {
      var spy = sinon.spy()
      go(spy)
      assert(spy.called)
    })
  })

  describe('merge()', () => {

    it ('should take from all inputs and put onto single output channel', (cb) => {

      var a = chan()
      var b = chan()
      var c = chan()
      var merged = merge(a, b, c)
      
      go(async () => {

        await put(a, 1)
        await put(b, 2)
        await put(c, 3)

        let fromA = await take(merged)
        let fromB = await take(merged)
        let fromC = await take(merged)

        assert.equal(fromA, 1)
        assert.equal(fromB, 2)
        assert.equal(fromC, 3)

      }).then(cb)
    })

    it ('should close output channel when all inputs are closed', (cb) => {

      var a = chan()
      var b = chan()
      var c = chan()
      var merged = merge(a, b, c)
      
      go(async () => {
        assert.equal(merged.isClosed, false)
        close(a)
        close(b)
        close(c)
      })
      .then(() => assert.equal(merged.isClosed, true))
      .then(cb)
    })
  })
})

