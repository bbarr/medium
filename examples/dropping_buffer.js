
import channels from '../lib/index'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan(buffers.dropping(2))

go(async function() {
  await sleep(1000)
  console.log('waited a second')
  console.log('this should be a 1:', await take(ch))
  console.log('this should be a 2:', await take(ch))
  await take(ch)
  console.log('this will just be queued, because the three was dropped and there are no pending puts')

})

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  console.log('this 3 gets dropped')
  await put(ch, 3)
  console.log('and is released immediately')

})
