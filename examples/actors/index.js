
const { send, kill, spawn, actor } = require('./actor')
const { go, chan, repeatTake } = require('../../build/index')

const counter = actor([

  { cmd: 'inc' }, 
  (_, count) => count + 1,

  { cmd: 'dec' }, 
  (_, count) => count - 1,

  { cmd: 'get' }, 
  (_, count, reply) => reply(count)

], 0)


const c1 = spawn(counter)

go(async () => {

  await cast(c1, { cmd: 'inc' })
  await cast(c1, { cmd: 'inc' })
  await cast(c1, { cmd: 'get' })

  process.exit(0)
})

