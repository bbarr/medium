
const { go, chan, buffers, take, put, repeatTake } = require('../lib/index')

const clock = chan(buffers.throttled(1000))

go(async () => {
  await repeatTake(clock, async (payload, lastMsg) => {
    const msg = lastMsg === 'tick' ? 'tock' : 'tick'
    console.log(`The clock goes: '${msg}'`)
    return msg
  }, 'tock')
})

go(async () => {
  await put(clock, 1)
  await put(clock, 1)
  await put(clock, 1)
  await put(clock, 1)
  await put(clock, 1)
  await put(clock, 1)
  put(clock, 1)
  put(clock, 1)
  put(clock, 1)
  put(clock, 1)
  put(clock, 1)
  put(clock, 1)
})

