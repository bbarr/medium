
import channels from '../lib/index'

var { go, chan, take, put, sleep } = channels

var ch = chan(2)

go(async function() {

  await sleep(1000)

  // this take() will create room for the 3
  await take(ch)
})

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  await put(ch, 3)

  console.log('finally, 3 added to buffer')
})

