
import assert from 'assert'
import sinon from 'sinon'

import csp from '../lib/index'

var { sleep, chan, go, put, take, ops, close, CLOSED } = csp

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

  describe('go()', () => {
    it ('should immediately invoke given function', () => {
      var spy = sinon.spy()
      go(spy)
      assert(spy.called)
    })
  })

  describe('ops.pipe()', () => {

    it ('should send all values to its destination', (cb) => {
      var ch1 = chan()
      var ch2 = chan()
      ops.pipe(ch1, ch2)
      put(ch1, 2)
      take(ch2)
        .then((val) => assert(val === 2))
        .then(cb)
    })

    it ('should close downstream on close', () => {
      var ch1 = chan()
      var ch2 = chan()
      ops.pipe(ch1, ch2)
      close(ch1)
      assert(ch2.closed)
    })
  })

  describe('ops.mult()', () => {

    it ('should send all values to each of its destinations', (cb) => {
      var ch1 = ops.mult(chan())
      var ch2 = chan()
      var ch3 = chan()

      ops.mult.tap(ch1, ch2)
      ops.mult.tap(ch1, ch3)

      put(ch1, 2)

      take(ch2)
        .then((val) => {
          assert(val === 2)
        })
        .then(() => {
          take(ch3).then((val) => {
            assert(val === 2)
            cb()
          })
        })
    })

    it ('should allow untapping', (cb) => {
      var ch1 = ops.mult(chan())

      var ch1 = ops.mult(chan())
      var ch2 = chan()

      ops.mult.tap(ch1, ch2)
      
      put(ch1, 1)

      take(ch2).then((val) => assert(val === 1))

      ops.mult.untap(ch1, ch2)

      take(ch2).then((val) => assert(false))

      put(ch1, 1)

      setTimeout(cb, 100)
    })

    it ('should close downstream on close', () => {
      var ch1 = ops.mult(chan())
      var ch2 = chan()
      var ch3 = chan()

      ops.mult.tap(ch1, ch2)
      ops.mult.tap(ch1, ch3)

      close(ch1)
      assert(ch2.closed)
      assert(ch3.closed)
    })
  })
})

