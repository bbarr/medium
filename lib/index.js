
const buffers = require('./buffers')

const CLOSED = Symbol('MEDIUM_CLOSED')

function chan(bufferOrN = buffers.base()) {

  const buffer = typeof bufferOrN === 'number' ? 
    buffers.fixed(bufferOrN) : 
    bufferOrN

  const ch = {
    buffer,
    isClosed: false,
    takes: [],
    then: (x, y) => take(ch).then(x, y)
  }

  // cross-reference for "always use" buffers 
  buffer.channel = ch
  buffer.run = run

  return ch
}

function take(ch) {

  var take = createAction()
  var put = !ch.buffer.alwaysUse && ch.buffer.shift()

  if (put && put.then) {
    return put.then(_put => {
      run(ch, _put, take)
      return take.promise
    })
  }

  if (put) {
    run(ch, put, take)
  } else {
    if (ch.isClosed) take.resolve(CLOSED)
    else ch.takes.push(take)
  }

  return take.promise
}

function put(ch, v) {

  var put = createAction({ payload: v })

  if (ch.isClosed) {
    put.resolve(false)
    return put.promise
  }

  var take = !ch.buffer.alwaysUse && ch.takes.shift()
  if (take) {
    run(ch, put, take)
  } else {
    ch.buffer.push(put)
  }

  return put.promise
}

// @TODO improve
// Takes channel and a promise from a previous put/take. Cancels it.
function cancel(ch, promise) {

  // cancel takes
  const pendingTakeI = findIndexByProp('promise', promise, ch.takes)
  if (isDefined(pendingTakeI)) 
    ch.takes.splice(pendingTakeI, 1) 

  // cancel puts
  const pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased)
  if (isDefined(pendingPutI) && ch.buffer.unreleased)
    ch.buffer.unreleased.splice(pendingPutI, 1)
}

function close(ch) {
  ch.takes.forEach((t) => t.resolve(CLOSED))
  ch.isClosed = true
  return ch
}

function go(afn) { 
  return afn() 
}

function sleep(ms) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

function clone(src) {
  return chan(src.buffer)
}

function repeat(afn, seed) {
  return go(async () => {
    var result = seed
    while (result !== false) {
      result = await afn(result)
    }
  })
}

function repeatTake(ch, afn, seed) {
  return go(async () => {
    let result = seed
    while (result !== false) {
      let item = await take(ch)
      result = await afn(item, result)
    }
  })
}

function merge(...chs) {

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

function any(...ports) {

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
          if (isPromise(p)) return
          cancel(p[0] || p, promises[i])
        })
      })
    })
  })
}

module.exports = {
  chan, 
  take,
  put,
  any,
  clone,
  repeat,
  repeatTake,
  cancel,
  close,
  merge,
  go,
  sleep,
  CLOSED,
  buffers
}

// private helpers
const isChan = obj => !!obj && !!obj.buffer && !!obj.then
const random = arr => arr[Math.floor(Math.random() * arr.length)]
const isDefined = a => typeof a !== 'undefined'
const isPromise = port => port instanceof Promise
const isPut = port => Array.isArray(port)

function run(ch, put, take) {
  take.resolve(put.payload)
  put.resolve && put.resolve(true)
}

function isResolvable(port) {
  if (isPromise(port)) return false
  if (isChan(port)) return !port.buffer.isEmpty()
  if (isPut(port)) return !!port[0].takes.length
  return false
}

function resolveLazyPuts(port) {
  if (!isPut(port)) return port.then(v => [ v, port ])
  return put(port[0], port[1]).then(v => [ v, port[0] ])
}

function createAction(config={}) {
  let _resolve;
  return {
    payload: config.payload,
    resolve: (payload) => _resolve(payload),
    promise: new Promise((res) => _resolve = res)
  }
}

function findIndexByProp(key, val, arr=[]) {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i
  }
  return -1
}

