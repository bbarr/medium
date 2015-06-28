
import buffers from './buffers'
import ts from './transducer_support'
import util from './util'

// CORE
function chan(bufferOrN, xduce) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  xduce = ts.transform(xduce)
  buffer.xduce = xduce // not sure about this coupling

  return {
    args: arguments,
    closed: false,
    takes: [],
    xduce: xduce,
    buffer: buffer,
    piped: []
  }
}

function take(ch) {

  var take = createAction()
  var put = ch.buffer.shift()

  if (put) {
    run(ch, put, take)
  } else {
    ch.takes.push(take)
  }

  return take.promise
}

function put(ch, v) {

  var take = ch.takes.shift()
  var put = createAction({ payload: v })

  if (take) {

    // handle transducer
    put.payload = ts.apply(ch.xduce, put.payload)
    if (typeof put.payload === 'undefined') {
      ch.takes.unshift(take) // nm, put it back
      return put.resolve(true)
    }

    run(ch, put, take)
  } else {
    ch.buffer.push(put)
  }

  return put.promise
}

function close(ch) {
  ch.closed = true
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
    resolve: util.once((payload) => _resolve(payload)),
    promise: new Promise((res) => _resolve = res)
  }
}


// OPERATIONS
function pipe(from, to) {
  go(async function() {
    while (true) {
      let current = await take(from)
      await put(to, current)
    }
  })
}

function mult(src) {
  var ch = clone(src)
  ch.taps = []
  go(async function() {
    while (true) {
      let current = await take(ch)
      for (let i = 0; i < ch.taps.length; i++) {
        await put(ch.taps[i], current)
      }
    }
  })
  return ch
}

mult.tap = function(src, dest) {
  src.taps.push(dest)
}

mult.untap = function(src, dest) {
  var i = src.taps.indexOf(dest)
  if (i === -1) return
    src.taps.splice(i, 1)
}

// API
export default { 
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
