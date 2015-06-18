
import channels from '../lib/index'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan(buffers.sliding(2))

go(async function() {
  await sleep(1000)
  console.log('waited a second')
  console.log('this should be a 2:', await take(ch))
  console.log('this should be a 3:', await take(ch))
})

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  console.log('this 3 gets slid into the last spot, dropping the first (1)')
  await put(ch, 3)
  console.log('and is released immediately')

})
