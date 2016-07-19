
import * as buffers from './buffers'
import ts from './transducer_support'

// CORE

// Will hopefully implement Flow here one day, but for now
// these super informal types can give some hints to us humans

// Channel = Object 
// Action = Object
// Buffer = Object
// BufferConfig = Buffer | Number
// LazyPut = [ Channel, Any ]
// AnyInput = Channel | Promise | LazyPut

// BufferConfig -> Function? -> Object? -> Channel
export function chan(bufferOrN, xduce=null, opts={}) {

  const buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  const ch = {
    [IS_CHANNEL]: true, 
    args: arguments,
    opts: opts,
    closed: false,
    takes: [],
    xduce: ts.transform(xduce),
    buffer: buffer,
    then: (x, y) => take(ch).then(x, y)
  }

  return ch
}

// Channel -> Promise
export function take(ch) {

  var take = createAction()

  if (ch.closed) {
    take.resolve(CLOSED)
    return take.promise
  }

  var put = ch.buffer.shift()
  if (put) {
    run(ch, put, take)
  } else {
    ch.takes.push(take)
  }

  return take.promise
}

// Channel -> Any -> Promise
export function put(ch, v) {

  var put = createAction({ payload: v })

  if (ch.closed) {
    put.resolve(false)
    return put.promise
  }

  // handle transducer
  put.payload = ts.apply(ch.xduce, put.payload)
  if (typeof put.payload === 'undefined') {
    put.resolve(true)
    return put.promise
  }

  var take = ch.takes.shift()
  if (take) {
    run(ch, put, take)
  } else {
    ch.buffer.push(put)
  }

  return put.promise
}

// @TODO improve
// Takes channel and a promise from a previous put/take. Cancels it.
// Channel -> Promise
export function cancel(ch, promise) {

  const pendingTakeI = findIndexByProp('promise', promise, ch.takes)
  const pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased)

  if (isDefined(pendingTakeI)) 
  	ch.takes.splice(pendingTakeI, 1) 

  if (isDefined(pendingPutI) && ch.buffer.unreleased) 
  	ch.buffer.unreleased.splice(pendingPutI, 1)
}

// Channel -> Channel
export function close(ch) {
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false)
  }
  ch.takes.forEach((t) => t.resolve(CLOSED))
  ch.closed = true
  return ch
}

// Channel -> Action -> Action
function run(ch, put, take) {
  take.resolve(put.payload)
  put.resolve(true)
}

// AsyncFunction -> Promise
export function go(afn) { return afn() }

// Number -> Promise
export function sleep(ms) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

// Channel -> Channel
export const clone = (src) => {
  return chan(...src.args)
}

// AsyncFunction -> Any -> Promise
export function repeat(afn, seed) {
  return go(async () => {
    var result = seed
    while (result !== false) {
      result = await afn(result)
    }
  })
}

// Channel -> AsyncFunction -> Any -> Promise
export function repeatTake(ch, afn, seed) {
  return go(async () => {
    let result = seed
    while (result !== false) {
      let item = await take(ch)
      result = await afn(item, result)
    }
  })
}

// ...Channel -> Channel
export function merge(...chs) {

  const out = chan()
  let closedCount = 0

  chs.forEach(ch => {
    repeatTake(ch, async (v) => {
      if (v === CLOSED) {
        closedCount++
        if (closedCount === chs.length) close(out)
        return false
      }
      put(out, v)
    })
  })

  return out
}

// AnyInput -> Promise
export function any(...ports) {

	const alreadyReady = ports.filter(isResolvable)

	if (alreadyReady.length > 0) 
		return resolveLazyPuts(random(alreadyReady))

	return new Promise(res => {

		let promises = []
		ports.forEach((port, i) => {
			go(async () => {
				const promise = resolveLazyPuts(port)
				promises.push(promise)
				res(await promise)

				// cancel all other cancelable actions!
				ports.forEach(p => {
					if (p === port) return
					if (isPromise(port)) return
					cancel(p[0] || p, promises[i])
				})
			})
		})
	})
}

// HELPERS

export const CLOSED = Symbol('medium-closed-state')
const IS_CHANNEL = Symbol('is-channel')

const isChan = obj => obj[IS_CHANNEL]
const random = arr => arr[Math.floor(Math.random() * arr.length)]
const isDefined = a => typeof a !== 'undefined'
const isPromise = port => port instanceof Promise
const isPut = port => Array.isArray(port)

const isResolvable = port => {
	if (isPromise(port)) return false
	if (isChan(port)) return !port.buffer.isEmpty()
	if (isPut(port)) return port[0].takes.length
}

const resolveLazyPuts = port => {
	if (!isPut(port)) return port.then(v => [ v, port ])
	return put(port[0], port[1]).then(v => [ v, port[0] ])
}

const createAction = (config={}) => {
  let _resolve;
  return {
    payload: config.payload,
    resolve: (payload) => _resolve(payload),
    promise: new Promise((res) => _resolve = res)
  }
}

// ugly for speed
const findIndexByProp = (key, val, arr) => {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i
  }
}
