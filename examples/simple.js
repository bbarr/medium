
import { chan, go, put, close, take, sleep, repeat, repeatTake, CLOSED } from '../lib/index'

let player = async (name, table) => {
  repeatTake(table, async (ball) => {
    if (ball === CLOSED) {
      console.log(`${name} is closed!`)
      return false
    }
    ball.hits++
    console.log(name, ball.hits)
    await sleep(100)
    put(table, ball)
  })
}

go(async () => {
  let table = chan()
  player('ping', table)
  player('pong', table)
  put(table, { hits: 0 })
  await sleep(1000)
  close(table)
})
