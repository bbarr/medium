
const km = require('kismatch').default
const { chan, go, put, buffers, close, sleep, repeatTake } = require('../../build/index')
const buffer = require('../redis/buffer')

const cast = async (actor, payload) => {
  //console.log('putting ', payload)
  return await put(actor.mailbox, payload)
}
const kill = actor => close(actor.mailbox)
const actor = (handlers, initialState) => {
  return {
    handlers,
    initialState
  }
}
const spawn = actor => {
  const id = Math.random() * 10000
  const mailbox = chan()
  const handler = km(...actor.handlers)
  repeatTake(mailbox, async (msg, state) => {
    const reply = value => 
      console.log('replied with', value)
    console.log(msg, state, reply)
    const result = await handler(msg, state, reply)
    //console.log('new state', typeof result === 'undefined' ? state : result)
    return typeof result === 'undefined' ? state : result
  }, actor.initialState)
  return { id, mailbox }
}

module.exports = {
  cast,
  kill,
  spawn,
  actor
}
