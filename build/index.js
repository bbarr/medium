
//      

const _buffers = require('./buffers')
const ts = require('./transducer_support')

// CORE

const buffers = _buffers

function chan(bufferOrN               , xduce         , opts         = {})          {

  const buffer = typeof bufferOrN === 'number' ? 
    _buffers.fixed(bufferOrN) : 
    bufferOrN || _buffers.base()

  const ch = {
    isClosed: false,
    args: arguments,
    opts: opts,
    takes: [],
    xduce: ts.transform(xduce),
    buffer: buffer,
    then: (x, y) => take(ch).then(x, y)
  }

  return ch
}

function take(ch         )                {

  var take = createAction()

  if (ch.isClosed) {
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

function put(ch         , v     )                {

  var put = createAction({ payload: v })

  if (ch.isClosed) {
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
function cancel(ch         , promise              )        {

  // cancel takes
  const pendingTakeI = findIndexByProp('promise', promise, ch.takes)
  if (isDefined(pendingTakeI)) 
    ch.takes.splice(pendingTakeI, 1) 

  // cancel puts
  const pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased)
  if (isDefined(pendingPutI) && ch.buffer.unreleased)
    ch.buffer.unreleased.splice(pendingPutI, 1)
}

function close(ch         )           {
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false)
  }
  ch.takes.forEach((t) => t.resolve(CLOSED))
  ch.isClosed = true
  return ch
}

function run(ch         , put        , take        )        {
  take.resolve(put.payload)
  put.resolve(true)
}

function go(afn          )                { return afn() }

function sleep(ms        )                {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

const clone = (src         )           => {
  return chan(...src.args)
}

function repeat(afn          , seed     )                {
  return go(async () => {
    var result = seed
    while (result !== false) {
      result = await afn(result)
    }
  })
}

function repeatTake(ch         , afn          , seed     )                {
  return go(async () => {
    let result = seed
    while (result !== false) {
      let item = await take(ch)
      result = await afn(item, result)
    }
  })
}

function merge(...chs                )           {

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

function any(...ports            )                {

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

// HELPERS

const CLOSED         = Symbol('MEDIUM_CLOSED')
const isChan = (obj          )        => !!obj && !!obj.buffer && !!obj.then
const random = (arr            )       => arr[Math.floor(Math.random() * arr.length)]
const isDefined = (a     )        => typeof a !== 'undefined'
const isPromise = (port     )        => port instanceof Promise
const isPut = (port     )        => Array.isArray(port)

const isResolvable = (port     )        => {
  if (isPromise(port)) return false
  if (isChan(port)) return !port.buffer.isEmpty()
  if (isPut(port)) return !!port[0].takes.length
  return false
}

const resolveLazyPuts = (port     )                => {
  if (!isPut(port)) return port.then(v => [ v, port ])
  return put(port[0], port[1]).then(v => [ v, port[0] ])
}

const createAction = (config          = {})          => {
  let _resolve;
  return {
    payload: config.payload,
    resolve: (payload) => _resolve(payload),
    promise: new Promise((res) => _resolve = res)
  }
}

// ugly for speed
const findIndexByProp = (key        , val     , arr             = [])          => {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i
  }
  return -1
}

module.exports = {
  buffers,
  chan,
  take,
  put,
  close,
  cancel,
  any,
  repeat,
  repeatTake,
  merge,
  sleep,
  clone,
  go,
  CLOSED
}
