
const { go, sleep, CLOSED } = require('./index')
const createRedisChannel = require('./redis')

const { take, put } = createRedisChannel()

go(async () => {
  while (true) {

    const hits = await take('table')
    console.log('player2 hit: ', hits)

    if (hits === CLOSED) break

    await sleep(500)
    const nextHit = hits > 9 ? CLOSED : hits + 1
    await put('table', nextHit)
  }
})
