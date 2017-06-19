
const { go, chan, take, put, sleep, buffers } = require('../../build/index')
const buffer = require('./buffer')

const things = chan(buffer)

go(async () => {

  console.log('waiting...')
  await sleep(5000)

  const thing = await take(things)

  console.log('got a thing from redis!', thing)

  process.exit(0)
})
