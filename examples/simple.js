
import { chan, go, put, take, sleep, repeat, repeatTake, CLOSED } from '../lib/index'

var items = chan()
var ticks = chan()

repeatTake(items, async (item) => {
  await take(ticks)
  console.log('got a throttled item!', item)
})

repeat(async () => {
  await sleep(1000)
  await put(items, { createdAt: Date.now() })
})

repeat(async () => {
  await sleep(3000)
  await put(ticks, true)
})
