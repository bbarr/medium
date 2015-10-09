
import assert from 'assert'
import sinon from 'sinon'
import t from 'transducers-js'

import csp from '../lib/index'

var { sleep, chan, go, put, take, clone, close, CLOSED, any } = csp

describe('channels', () => {

  describe('take()', () => {

    it ('should return a promise', () => {
      assert(put(chan()) instanceof Promise)
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
        await take(sleep(1000))
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
      var taken = take(ch)
      close(ch)
      taken
        .then((val) => assert(val === CLOSED))
        .then(cb)
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

    it ('should resolve with first channel that receives a value', (cb) => {
      go(async () => {
        var foo = chan()
        var t = sleep(1000)
        var [ val, ch ] = await any(foo, t)
        assert(ch === t)
      }).then(cb)
    })

    it ('should resolve immediately if one channel has a pending put', (cb) => {
      go(async () => {
        var foo = chan()
        var bar = chan()
        var t = sleep(1000)
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
  })

  describe('go()', () => {
    it ('should immediately invoke given function', () => {
      var spy = sinon.spy()
      go(spy)
      assert(spy.called)
    })
  })
})

