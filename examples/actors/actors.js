
import km from 'kismatch'
import { chan, go, put, close, sleep, repeatTake } from '../../lib/index'

let cast = (actor, payload) => put(actor.mailbox, payload)
let kill = actor => actor.kill()
let spawn = actor => {
  let mailbox = chan()
  actor(mailbox)
  return { mailbox }
}

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
