
import assert from 'assert'
import sinon from 'sinon'

import buffers from '../lib/buffers'

var actionStub = () => { 
	return { resolve() { } }
}

describe('channels', () => {
	
	describe('base (unbuffered) buffer', () => {
		
		it ('should always pass puts into unreleased array', () => {
			var buffer = buffers.base()
			assert(buffer.unreleased.length === 0)
			buffer.push({})
			assert(buffer.unreleased.length === 1)
		})

		it ('should always shift off unreleased', () => {
			var buffer = buffers.base()
			var obj = obj
			buffer.push(obj)
			assert(buffer.unreleased.length === 1)
			assert(buffer.shift() === obj)
			assert(buffer.unreleased.length === 0)
		})
	})

	describe('fixed', () => {

		describe('when there is room', () => {

			it ('should immediately release', () => {
				var buffer = buffers.fixed(2)
				var action = actionStub()
				var spy = sinon.spy(action, 'resolve')
				buffer.push(action)
				assert(spy.calledWith(true))
			})
		})

		describe('when there is not room', () => {

			it ('should queue up', () => {

				var buffer = buffers.fixed(2)

				// fill buffer
				buffer.push(actionStub())
				buffer.push(actionStub())

				buffer.push(actionStub())

				assert(buffer.released.length === 2)
				assert(buffer.unreleased.length === 1)

			})

			it ('should release next action when buffer full and has > 1 waiting', () => {
				
				var buffer = buffers.fixed(1)

				buffer.push(actionStub())
				buffer.push(actionStub())

				assert(buffer.released.length === 1)
				assert(buffer.unreleased.length === 1)

				var spy = sinon.spy(buffer.unreleased[0], 'resolve')
				buffer.shift()

				assert(spy.called)

				assert(buffer.released.length === 1)
				assert(buffer.unreleased.length === 0)
			})
		})
	})
})
