
import channels from '../lib/index'
import t from 'transducers-js'

var { go, chan, take, put, sleep, buffers, pipe } = channels

var allowEven = t.filter((n) => n % 2 === 0)
var ch = chan(2, allowEven)

go(async function() {
  console.log(await take(ch))
  console.log(await take(ch))
})

put(ch, 1)
put(ch, 2)
put(ch, 3)
