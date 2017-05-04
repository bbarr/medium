
import km from 'kismatch'
import { chan, go, put, close, sleep, repeatTake } from '../../lib/index'
import jackrabbit from 'jackrabbit'

const rabbit = jackrabbit('amqp://localhost:5672')

const cast = (actor, payload) => {
  actor.exchange.queue({ name: actor.name })
  actor.exchange.publish(payload, { key: actor.name })
  console.log('key', actor.name)
  //put(actor.mailbox, payload)
}
const kill = actor => {
  close(actor.mailbox)
}
const spawn = (name, actor) => {
  const mailbox = chan()
  const exchange = rabbit.default()
  console.log('queue name', name)
  exchange.queue({ name }).consume(v => {
    put(mailbox, v)
  }, { noAck: true })
  actor(mailbox)
  return { mailbox, exchange, name }
}

const c = spawn('foo-counter', () => true)

cast(c, { cmd: 'inc' })
cast(c, { cmd: 'inc' })
cast(c, { cmd: 'log' })

