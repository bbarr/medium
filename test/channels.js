
import assert from 'assert'

import csp from '../lib/index'

var { sleep, chan, go, put, take, close } = csp

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
			var val = 1;

			go(async function() {
				val = await take(ch)
			})

			process.nextTick(() => {
				assert(val === 1)
				cb()
			})
		})
	})

	describe('put()', () => {
		it ('should return a promise', () => {
			assert(put(chan()) instanceof Promise)
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
			let ch = chan()
			assert(!ch.closed)
			close(ch)
			assert(ch.closed)
		})
	})

	describe('go()', () => {
		it ('should immediately invoke given function', () => {
			let called = false
			go(() => called = true)
			assert(called)
		})
	})
})

