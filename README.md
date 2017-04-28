# Medium
CSP-style channel library using ES7 async/await keywords.

#### Installation

```javascript
npm install medium
```

#### First, the requisite ping/pong example
```javascript

import { chan, go, put, close, take, sleep, repeatTake, CLOSED } from 'medium'

const player = async (name, table) => {

  repeatTake(table, async (ball, { hitCount }) => {

    if (ball === CLOSED) {
      console.log(`${name} hit the ball ${hitCount} times!`)
      return false // returning false is how you BREAK a repeat or repeatTake
    }

    await sleep(100)
    put(table, ball)

    // return a value to store it as state, and access it as the second argument above
    return { hitCount: hitCount + 1 }

  }, { hitCount: 0 })
}

go(async () => {
  const table = chan()
  player('ping', table)
  player('pong', table)
  put(table, { hits: 0 })
  await sleep(1000)
  close(table)
})

```

#### Channel interactions in a nutshell

Channels are queues, you can ```put``` things onto them and ```take``` things off, in a first-in-first-out way. Channels can be closed, after which, they will not receive or deliver values. ```put``` and ```take``` are both asynchronous actions, and return promises. ```put``` promises simply resolve to ```true``` if it was able to successfully add its value to the channel, or ```false``` if the channel is closed. ```take``` promises resolve either to whatever was next in the channel queue, or to the constant ```CLOSED``` if the channel is closed. For example:

```javascript
const ch1 = chan()
put(ch1, 1)
take(ch1).then(::console.log)
// LOGS: 1

take(ch1).then(::console.log)
put(ch1, 2)
// LOGS: 2

take(ch1).then(::console.log)
close(ch1)
// LOGS: CLOSED

put(ch1, 3).then(::console.log)
// LOGS: false
```

The strategy with which a channel handles an excess of ```put```s is implemented as a ```buffer```. The default channel does not allow for any buffered values, so if you ```put``` without a waiting ```take``` for the value, it will not resolve the ```put``` until a corresponding ```take``` is added. For example:

#### No buffer
```javascript
const ch1 = chan()
put(ch1, 1).then(() => console.log('put 1'))
put(ch1, 2).then(() => console.log('put 2'))
take(ch1)
// LOGS: 'put 1'
take(ch1)
// LOGS: 'put 2'
```

An example of a different buffer would be a "fixed" buffer, which has N slots for ```put``` values to wait for a ```take```. For example:

#### Fixed buffer
```javascript
const ch = chan()
const fixedCh = chan(buffers.fixed(2)) // or shortcut with chan(2)

put(ch, 1).then(::console.log)
// LOGS NOTHING

put(fixedCh, 1).then(() => console.log('put 1'))
// LOGS: put 1
put(fixedCh, 2).then(() => console.log('put 2'))
// LOGS: put 2
put(fixedCh, 3).then(() => console.log('put 3'))
// LOGS NOTHING

take(fixedCh).then(::console.log)
// LOGS: 1
// LOGS: put 3

```

The other included buffers are, "dropping", which allows N puts, then begins "dropping" them, causing the put to resolve successfully but the value is not added to the channel, and "sliding", which allows N puts, then begins shifting the buffer, dropping the oldest buffered ```put``` value and adding the newest to the other end.

#### Dropping buffer
```javascript
const ch = chan(buffers.dropping(2))
put(ch, 1)
put(ch, 2)
put(ch, 3) // this is dropped
take(ch).then(::console.log)
// LOGS: 1
take(ch).then(::console.log)
// LOGS: 2
take(ch).then(::console.log)
// LOGS NOTHING
put(ch, 3)
// LOGS: 3
```

#### Sliding buffer
```javascript
const ch = chan(buffers.sliding(2))
put(ch, 1)
put(ch, 2)
put(ch, 3) // this causes the put of 1 to be dropped
take(ch).then(::console.log)
// LOGS: 2
take(ch).then(::console.log)
// LOGS: 3

```

#### Transducers
Of course, you may need to filter or modify values as they are put onto the channel. 
Transducers are the best option here, and are fully supported using Ramda, Transducers, etc.

```javascript
import t from 'transducers-js'

const shouts = chan(null, t.map(str => `${str}!!!`))
put(shouts, 'HAI')
take(shouts).then(::console.log)
// LOGS: 'HAI!!!'
```

#### Building something larger

Things get much more interesting though when we use async/await to better coordinate our channels.

```javascript
import t from 'transducers-js'
import { chan, put, take, sleep, go } from 'medium'

const numbers = chan()
const oddNumbers = chan(null, t.filter(n => n % 2))

go(async () => {
  while (true) {
    console.log('an odd number: ', await take(oddNumbers))
  }
})

go(async () => {
  while (true) {
    let n = await numbers // awaiting a channel is an implied "take"
    await put(oddNumbers, n)
  }
})

go(async () => {
  while (true) {
    let randomNum = Math.floor(Math.random() * 100)
    await put(numbers, randomNum)
    await sleep(1000)
  }
})

```

So we have a number being generated every second, and put onto the ```numbers``` channel. This is consumed and tested for "oddness", and if it passes, then it is put onto the ```oddNumbers``` channel where it is simply console.log'ed.

What if we want to keep track of the percent odd vs. even? We can put a bit of local state in the process that checks for oddness. However, mutating state sucks, so, we use the function ```repeat``` to both act as a ```while``` loop and manage state immutably!

```javascript
import { chan, put, take, sleep, go, repeat } from 'medium'

const numbers = chan()
const oddNumbers = chan()
const stats = chan()

go(async () => {
  while (true) {
    console.log('an odd number: ', await oddNumbers)
  }
})

go(async () => {
  while (true) {
    console.log('Stats: ', await stats)
  }
})

go(async () => {
  repeat(async ({ total, odds }) => {
    put(stats, `${odds / total * 100}% odd numbers`)
    
    const n = await numbers
    if (n % 2) {
      put(oddNumbers, n)
      return { total: total + 1, odds: odds + 1 }
    } else {
      return { total: total + 1, odds }
    }
    
  }, { total: 0, odds: 0 })
})

go(async () => {
  while (true) {
    let randomNum = Math.floor(Math.random() * 100)
    await put(numbers, randomNum)
    await sleep(1000)
  }
})
```

And now we see that, indeed, our universe isn't broken and over time our cumalitive chance of an odd number closes in on 50%.

We can even take our ```repeat``` function one step further, and use ```repeatTake```, since that is exactly what we are doing.

```javascript
go(async () => {
  repeatTake(numbers, async (n, { total, odds }) => {
    put(stats, `${odds / total * 100}% odd numbers`)
    
    if (n % 2) {
      put(oddNumbers, n)
      return { total: total + 1, odds: odds + 1 }
    } else {
      return { total: total + 1, odds }
    }
    
  }, { total: 0, odds: 0 })
})
```

So we just change the signature a bit, and our local "repeat" state is passed as the second argument instead of the first. 

More documentation is coming, but the core functionality is ~160LOC, so it should 
just take a single cup of coffee to read through. I wanted to be sure that the API was built 
deliberately, and not just a port from some previous effort.

## API 

### chan(numOrBuffer=null, xducer=null) -> Chan
Creates a channel. All arguments are optional.
**numOfBuffer** - Any number or buffer. A number is a shortcut for ```buffers.fixed(number)```.
**xducer** - a transducer to process/filter values with.

### put(ch, val) -> Promise -> true|false
Puts a value onto a channel. Returned promise resolves to true if successful, or false if the channel is closed.

### take(ch) -> Promise -> takenValue|CLOSED
Takes a value from a channel. Returned Promise resolves to taken value or CLOSED constant if the channel is closed.

### go(async function) -> promiseFromInvokedAsyncFunction
Immediately invokes (and returns) given function.

### sleep(ms) -> Promise
Creates a promise that will resolve successfully after ```ms``` milliseconds.

### CLOSED
A constant, which all takes on a closed channel receive instead of a value.

### close(ch) -> undefined
Closes a channel. This causes:
- all puts and pending puts to resolve to false
- all takes and pending takes to resolve to the CLOSED constant

### clone(ch) -> Chan
Makes a new channel, same as the old channel.

### any(...ports) -> Promise -> [theResolvedValue, theSourceChannelOrPromise]
Like ```alts``` in Clojure's ```core-async```.

```ports``` can be a channel to take from, a promise to resolve, or an array 
to put data onto a channel, like ```[ theChannel, valueToPut ]```.

If none of them have a pending value, it will resolve with whichever channel receives a value next.
If one of the channels has a pending value already, it will simply resolve to that.
If more than one channel has a pending value, it selects one in a non-deterministic fashion.

Always resolves with a double of ```[ theResolvedValue, theSourceChannel ]```.

All non-winning actions will be canceled so that their data does not go missing.

### repeat(async function, seed=null) -> undefined
I don't love ```while``` loops, so I use this instead. 

As a bonus, you can track state without mutations! Return a value other than false, and it will be available as the argument to your callback async function. Pass in a ```seed``` value as the second argument to repeat.

### repeatTake(ch, async function, seed=null) -> undefined
This is jsut like ```repeat``` above, except that before it repeats, it waits for a successful ```take``` on the given channel. Then it passes this taken value in as the first argument, with any local state being passed as the second argument.

See the ping/pong example above to see this in action.

### merge(...chs)
Creates a new channel that will receive all puts to the received channels.

## buffers
### buffers.unbuffered()
No buffer space. The default choice for when first argument to ```chan``` is falsy.
### buffers.fixed(num)
Buffer has space of ```num```. Any extra ```put```s are parked.
### buffers.sliding(num)
Buffer simply slides across pending puts as a window of ```num``` width. So, oldest puts are dropped as new ones are added.
### buffers.dropping(num)
Buffer drops, and resolves, any extra puts beyond ```num```.


