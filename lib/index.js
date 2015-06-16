
import buffers from './buffers'
import util from './util'

function createChannel(bufferOrN) {

  var buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN || buffers.base()

  return {
    closed: false,
    takes: [],
    buffer: buffer
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
  var put = createAction({ payload: v })

  if (take) {
    run(ch, put, take)
  } else {
    ch.buffer.push(put)
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
  chan: createChannel 
}
