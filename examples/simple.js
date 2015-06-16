
import channels from '../lib/index'

var { go, chan, take, put, sleep } = channels

var ch = chan()

go(async function() {
  while (true) {
    var val = await take(ch)
    console.log('some val was given to ch', val)
  }
})

go(async function() {
  await sleep(200)
  await put(ch, 1)
  await sleep(200)
  await put(ch, 2)
  await sleep(200)
  await put(ch, 3)
})
