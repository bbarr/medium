
import buffers from './buffers'
import ts from './transducer_support'
import util from './util'

const CLOSED = 'medium-closed-state'

// CORE
function chan(bufferOrN, xduce) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  return {
    args: arguments,
    closed: false,
    takes: [],
    xduce: ts.transform(xduce),
    buffer: buffer,
    downstream: [],
    taps: [],
    piped: []
  }
}

function take(ch) {

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

function put(ch, v) {

  var put = createAction({ payload: v })

  if (ch.closed) {
    put.resolve(false)
    return put.promise
  }

  // handle transducer
  put.payload = ts.apply(ch.xduce, put.payload)
  if (typeof put.payload === 'undefined') {
    ch.takes.unshift(take) // nm, put it back
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

function close(ch) {
  ch.closed = true
  ch.downstream.forEach(close)
  ch.takes.forEach((t) => t.resolve(CLOSED))
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false)
  }
}

// UTILITIES
function go(afn) { return afn() }

function sleep(ms) {
  return new Promise((res) => setTimeout(res.bind(null, true), ms))
}

function clone(ch) {
  return chan.apply(null, ch.args)
}

function run(ch, put, take) {
  take.resolve(put.payload)
  put.resolve(true)
}

function createAction(config={}) {

  var _resolve;

  return {
    payload: config.payload,
    resolve: (payload) => _resolve(payload),
    promise: new Promise((res) => _resolve = res)
  }
}


// OPERATIONS
function pipe(from, to, opts) {
  from.piped.push([ to, opts ])
  from.downstream.push(to)
  go(async function() {
    while (true) {
      let current = await take(from)
      if (current === CLOSED) break
      await put(to, current)
    }
  })
}

function mult(src) {
  var ch = clone(src)
  go(async function() {
    while (true) {
      let current = await take(ch)
      if (current === CLOSED) break
      for (let i = 0; i < ch.taps.length; i++) {
        var result = await put(ch.taps[i][0], current)
        if (result === false) mult.untap(src, ch.taps[i][0])
      }
    }
  })
  return ch
}

mult.tap = function(src, dest, opts) {
  src.taps.push([ dest, opts ])
  src.downstream.push(dest)
}

mult.untap = function(src, dest) {
  util.findAndRemoveChannelWithOpts(src.taps, dest)
  src.downstream.splice(src.downstream.indexOf(dest), 1)
}

// API
export default { 
  CLOSED: CLOSED,
  go, 
  sleep, 
  close, 
  put, 
  take, 
  buffers,
  chan,
  ops: {
    pipe,
    mult
  }
}
