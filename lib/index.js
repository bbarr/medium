
import buffers from './buffers'
import ts from './transducer_support'

let isDefined = a => typeof a !== 'undefined'
let findIndexByProp = (key, val, arr) => {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i
  }
}

export const CLOSED = Symbol('medium-closed-state')

// CORE
export function chan(bufferOrN, xduce=null, opts={}) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  let ch = {
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

export function cancel(ch, promise) {

  let pendingTakeI = findIndexByProp('promise', promise, ch.takes)
  let pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased)

  if (isDefined(pendingTakeI)) 
    ch.takes.splice(pendingTakeI, 1) 
  if (isDefined(pendingPutI)) 
    ch.buffer.unreleased && ch.buffer.unreleased.splice(pendingPutI, 1)
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

// UTILITIES
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

let random = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function any(...ports) {

  let promises = []
  let isTake = port => !Array.isArray(port) && port.buffer
  let isPromise = port => port instanceof Promise
  let getChan = port => isTake(port) || isPromise(port) ? port : port[0]

  let ready = ports.filter((port) => {
    if (isPromise(port)) return false
    if (isTake(port)) return !port.buffer.isEmpty()
    return getChan(port).takes.length
  })

  let format = (port) => {
    if (isTake(port) || isPromise(port)) return port.then(v => [ v, port ])
    return put(port[0], port[1]).then(v => [ v, port[0] ])
  }

  if (ready.length > 0) return format(random(ready))

  return new Promise((res) => {

    ports.forEach((port, i) => {
      go(async () => {

        let promise = format(port)
        promises.push(promise)
        let next = await promise

        // cancel all other actions!
        ports
          .filter(p => p !== port)
          .forEach(p => {
            let ch = getChan(p)
            cancel(ch, promises[i])
          })

        res(next)
      })
    })
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
