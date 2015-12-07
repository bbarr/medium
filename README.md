# Medium
CSP-style channel library using ES7 async/await keywords.

More documentation is coming, but the core functionality is ~160LOC, so it should 
just take a single cup of coffee to read through. This is obviously a pretty 
lightweight implementation, but I wanted to be sure that the API was built 
deliberately, and not just a port from some previous effort.

####Installation

```javascript
npm install medium
```

##Examples

####Basic ping/pong
```

import { chan, go, put, close, take, sleep, repeatTake, CLOSED } from '../lib/index'

let player = async (name, table) => {
  repeatTake(table, async (ball) => {
    if (ball === CLOSED) {
      console.log(`${name} is closed!`)
      return false
    }
    ball.hits++
    console.log(name, ball.hits)
    await sleep(100)
    put(table, ball)
  })
}

go(async () => {
  let table = chan()
  player('ping', table)
  player('pong', table)
  put(table, { hits: 0 })
  await sleep(1000)
  close(table)
})

```

##API 

###chan(numOrBuffer=null, xducer=null)

###put(ch, val)

###take(ch)

###go(async function)

###sleep(ms)

###close(ch)

###clone(ch)

###any(ch1, ch2, ch3, ...)

###repeat(async function, seed=null)

###repeatTake(ch, async function, seed=null)

##buffers
###buffers.unbuffered()
###buffers.fixed(num)
###buffers.sliding(num)
###buffers.dropping(num)


