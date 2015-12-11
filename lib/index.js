
import buffers from './buffers'
import ts from './transducer_support'

// helpers
let isChan = obj => obj[IS_CHANNEL]
let random = arr => arr[Math.floor(Math.random() * arr.length)]
let isDefined = a => typeof a !== 'undefined'
let findIndexByProp = (key, val, arr) => {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i
  }
}

export const CLOSED = Symbol('medium-closed-state')
const IS_CHANNEL = Symbol('is-channel')

// CORE
export function chan(bufferOrN, xduce=null, opts={}) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  let ch = {
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
export function cancel(ch, promise) {

  let pendingTakeI = findIndexByProp('promise', promise, ch.takes)
  let pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased)

  if (isDefined(pendingTakeI)) ch.takes.splice(pendingTakeI, 1) 
  if (isDefined(pendingPutI) && ch.buffer.unreleased) ch.buffer.unreleased.splice(pendingPutI, 1)
}

export function close(ch) {
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false)
  }
  ch.takes.forEach((t) => t.resolve(CLOSED))
  ch.closed = true
}

function run(ch, put, take) {
  take.resolve(put.payload)
  put.resolve(true)
}

export function go(afn) { return afn() }

export function sleep(ms) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

export function clone(src) {
  return chan(...src.args)
}

function createAction(config={}) {

  let _resolve;

  return {
    payload: config.payload,
    resolve: (payload) => _resolve(payload),
    promise: new Promise((res) => _resolve = res)
  }
}

export function repeat(afn, seed) {
  go(async () => {
    var result = seed
    while (true) {
      result = await afn(result)
      if (result === false) break
    }
  })
}

export function repeatTake(ch, afn, seed) {
  go(async () => {
    var result = seed
    while (true) {
      var item = await take(ch)
      var result = await afn(item, result)
      if (result === false) break
    }
  })
}

export function merge(...chs) {

  let out = chan()
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

// @TODO improve
export let any = (() => {

  let isTake = isChan
  let isPromise = port => port instanceof Promise
  let isPut = port => Array.isArray(port)

  let isResolvable = (port) => {
    if (isPromise(port)) return false
    if (isTake(port)) return !port.buffer.isEmpty()
    if (isPut(port)) return port[0].takes.length
  }

  let format = (port) => {
    if (!isPut(port)) return port.then(v => [ v, port ])
    return put(port[0], port[1]).then(v => [ v, port[0] ])
  }

  return (...ports) => {

    let promises = []
    let alreadyReady = ports.filter(isResolvable)

    if (alreadyReady.length > 0) return format(random(alreadyReady))

    return new Promise(res => {

      ports.forEach((port, i) => {
        go(async () => {
          let promise = format(port)
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
})()
