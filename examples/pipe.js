
import channels from '../lib/index'
import t from 'transducers-js'

var { go, chan, take, put, sleep, buffers, fns } = channels
var pipe = fns.pipe

var isEven = (n) => n % 2 === 0
var inc = (n) => n + 1

var ch1 = chan()
var ch2 = chan(10, t.filter(isEven))
var ch3 = chan(10, t.map(inc))
pipe(ch1, ch2)
pipe(ch2, ch3)

go(async function() {
  while (true) {
    console.log(await take(ch3))
  }
})

put(ch1, 1)
put(ch1, 2)
put(ch1, 3)
put(ch1, 4)
put(ch1, 5)
