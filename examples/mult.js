
import channels from '../lib/index'

var { go, chan, take, put, sleep, buffers, fns } = channels
var mult = fns.mult

var ch1 = mult(chan())

var ch2 = chan()
var ch3 = chan()

mult.tap(ch1, ch2)
mult.tap(ch1, ch3)

go(async function() {
  while (true) {
    console.log('ch2', await take(ch2))
  }
})

go(async function() {
  while (true) {
    console.log('ch3', await take(ch3))
  }
})

put(ch1, 1)
put(ch1, 2)
put(ch1, 3)
put(ch1, 4)
put(ch1, 5)
