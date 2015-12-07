# Medium
CSP-style channel library using ES7 async/await keywords.

####Installation

```javascript
npm install medium
```

##Examples

####Basic ping/pong
```

import { chan, go, put, close, take, sleep, repeatTake, CLOSED } from '../lib/index'

let player = async (name, table) => {

  repeatTake(table, async (ball, state) => {

    if (ball === CLOSED) {
      console.log(`${name} hit the ball ${state.hitCount} times!`)
      return false // returning false is how you BREAK a repeat or repeatTake
    }

    console.log(name, ball.hits)

    await sleep(100)
    put(table, ball)

    // return a value to store it as state, and access it as the second argument above
    return { hitCount: state.hitCount + 1 }

  }, { hitCount: 0 })
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

More documentation is coming, but the core functionality is ~160LOC, so it should 
just take a single cup of coffee to read through. I wanted to be sure that the API was built 
deliberately, and not just a port from some previous effort.

##API 

###chan(numOrBuffer=null, xducer=null)

###put(ch, val)

###take(ch)

###go(async function)

###sleep(ms)

###CLOSED
A constant, which all takes on a closed channel receive instead of a value.

###close(ch)
Closes a channel. This causes:
- all puts and pending puts to resolve to false
- all takes and pending takes to resolve to the CLOSED constant

###clone(ch)
Makes a new channel, same as the old channel.

###any(ch1, ch2, ch3, ...)
Like ```alts``` in Clojure's ```core-async```.

If none of them have a pending value, it will resolve with whichever channel receives a value next.
If one of the channels has a pending value already, it will simply resolve to that.
If more than one channel has a pending value, it selects one in a non-deterministic fashion.

Always resolves with a double of ```[ theResolvedValue, theSourceChannel ]```.

###repeat(async function, seed=null)
I don't love ```while``` loops, so I use this instead. 

As a bonus, you can track state without mutations! Return a value other than false, and it will be available as the argument to your callback async function. Pass in a ```seed``` value as the second argument to repeat.

###repeatTake(ch, async function, seed=null)
This is jsut like ```repeat``` above, except that before it repeats, it waits for a successful ```take``` on the given channel. Then it passes this taken value in as the first argument, with any local state being passed as the second argument.

See the ping/pong example above to see this in action.

##buffers
###buffers.unbuffered()
###buffers.fixed(num)
###buffers.sliding(num)
###buffers.dropping(num)


