
import buffers from './buffers'
import ts from './transducer_support'

export const CLOSED = 'medium-closed-state'

// CORE
export function chan(bufferOrN, xduce=null, opts={}) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  return {
    args: arguments,
    opts: opts,
    closed: false,
    takes: [],
    xduce: ts.transform(xduce),
    buffer: buffer
  }
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

  var _resolve;

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

export function any(...chs) {

  var ready = chs.filter((ch) => !ch.buffer.isEmpty())
  var format = (ch) => {
    return take(ch).then((val) => [ val, ch ])
  }

  if (ready.length === 1) {
    return format(ready[0])
  }

  if (ready.length > 1) {
    return format(ready[Math.floor(Math.random() * ready.length)])
  }

  return new Promise((res) => {
    chs.forEach((ch) => {
      go(async () => {
        var val = await take(ch)
        res([ val, ch ])
        close(ch)
      })
    })
  })
}
