
const km = require('kismatch').default
const { chan, go, put, close, sleep, repeatTake } = require('../../build/index')
const buffer = require('../redis/buffer')


let counter = (mailbox) => {

  repeatTake(mailbox, km(

    { cmd: 'inc' },
    (_, count) => count + 1,

    { cmd: 'dec' },
    (_, count) => count - 1,

    { cmd: 'log' },
    (_, count) => {
      console.log('LOGGING', count)
      return count
    }
  ), 0)
}

let c = spawn(counter)

go(async () => {
  cast(c, { cmd: 'inc' })
  cast(c, { cmd: 'inc' })
  cast(c, { cmd: 'log' })
})
