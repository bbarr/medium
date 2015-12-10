
import 'babel-polyfill'

import assert from 'assert'
import sinon from 'sinon'
import t from 'transducers-js'

import { cancel, merge, sleep, chan, go, put, take, clone, close, CLOSED, any } from '../lib/index'

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

      process.nextTick(() => {
        assert(expected === 1)
        cb()
      })
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
        await sleep(1000)
        subject = 2
      })

      setTimeout(() => {
        assert(subject === 1)
        setTimeout(() => {
          assert(subject === 2)
          cb()
        }, 600)
      }, 600)

    })
  })

  describe('clone()', () => {

    it ('should create a new chan with the same properties', () => {
      var bufferOrN = 1
      var xduce = t.map((n) => n + 1)
      var opts = { foo: 'bar' }
      var a = chan(bufferOrN, xduce, opts)
      var b = clone(a)
      assert.equal(JSON.stringify(a), JSON.stringify(b))
    })
  })

  describe('close()', () => {

    it ('should set channel closed property to true', () => {
      var ch = chan()
      assert(!ch.closed)
      close(ch)
      assert(ch.closed)
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

    let sleepyChan = (ms, val) => {
      let ch = chan()
      setTimeout(() => put(ch, val), ms)
      return ch
    }

    it ('should resolve with first channel that receives a value', (cb) => {
      go(async () => {
        var foo = chan()
        var t = sleepyChan(1000, 1)
        var [ val, ch ] = await any(foo, t)
        assert(ch === t)
      }).then(cb).catch(console.log.bind(console))
    })

    it ('should resolve immediately if one channel has a pending put', (cb) => {
      go(async () => {
        var foo = chan()
        var bar = chan()
        var t = sleepyChan(1000, 1)
        put(bar, 1)
        var [ val, ch ] = await any(foo, bar, t)
        assert(ch === bar)
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

    it ('should cancel all other channel actions after a resolved', (cb) => {
      go(async () => {
        var foo = chan()
        var bar = chan()
        var t = sleepyChan(1000, 1)
        put(bar, 1)
        await any(foo, bar, t)
        put(foo, 2)
        let val = await take(foo)
        assert.equal(val, 2)
      }).then(cb)
    })

    it ('should work with takes and puts - put winning', (cb) => {
      go(async () => {

        var forTakes = chan()
        var forPuts = chan()
        
        let gettingFirst = any(forTakes, [ forPuts, 1 ])
        
        await take(forPuts)

        let [ v, c ] = await gettingFirst
        
        assert.equal(v, 1)
        assert.equal(c, forPuts)

      }).then(cb)
    })

    it ('should work with takes and puts - take winning', (cb) => {

      go(async () => {

        let forTakes = chan()
        let forPuts = chan()
        
        let gettingFirst = any(forTakes, [ forPuts, 1 ])
        
        await put(forTakes, 2)

        let [ v, c ] = await gettingFirst
        
        assert.equal(v, 2)
        assert.equal(c, forTakes)

      }).then(cb)
    })

    it ('should work with raw promises - promise winning', (cb) => {

      go(async () => {

        let forTakes = chan()
        let forPuts = chan()
        let forPromise = Promise.resolve(3)
        
        let gettingFirst = any(forTakes, [ forPuts, 1 ], forPromise)
        
        let [ v, c ] = await gettingFirst
        
        assert.equal(v, 3)
        assert.equal(c, forPromise)

      }).then(cb)
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
        assert.equal(merged.closed, false)
        close(a)
        close(b)
        close(c)
      })
      .then(() => assert.equal(merged.closed, true))
      .then(cb)
    })
  })
})

