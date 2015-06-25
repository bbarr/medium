
import buffers from './buffers'
import ts from './transducer_support'
import util from './util'

function createChannel(bufferOrN, xduce) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  xduce = ts.transform(xduce)
  buffer.xduce = xduce // not sure about this coupling

  return {
    closed: false,
    takes: [],
    xduce: xduce,
    buffer: buffer,
    piped: []
  }
}

function createAction(config={}) {

  var _resolve;

  return {
    payload: config.payload,
    resolve: util.once((payload) => _resolve(payload)),
    promise: new Promise((res) => _resolve = res)
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
  var putAction = createAction({ payload: v })

  if (take) {

    // handle transducer
    putAction.payload = ts.apply(ch.xduce, putAction.payload)
    if (typeof putAction.payload === 'undefined') {
      ch.takes.unshift(take) // nm, put it back
      return putAction.resolve(true)
    }

    run(ch, putAction, take)
  } else {
    ch.buffer.push(putAction)
  }

  return put.promise
}

function close(ch) {
  ch.closed = true
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res.bind(null, true), ms))
}

function run(ch, put, take) {
  var data = put.payload
  take.resolve(data)
  put.resolve(true)

}

function pipe(from, to) {
  go(async function() {
    while (true) {
      let current = await take(from)
      await put(to, current)
    }
  })
}

function mult(src) {
  var ch = createChannel(src.buffer, src.xduce.src)
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

function go(afn) { return afn() }

// API
export default { 
  go, 
  run, 
  sleep, 
  close, 
  put, 
  take, 
  buffers,
  chan: createChannel,
  fns: {
    pipe,
    mult
  }
}
