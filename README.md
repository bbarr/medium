# channels
CSP-style channel library using ES7 async/await keywords

###Work in progress - Not stable!

##An example

```javascript

import channels from 'channels'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan()

go(async function() {
  while (true) {
    var val = await take(ch)
    console.log('some val was given to ch', val)
  }
})

go(async function() {
  await sleep(200)
  await put(ch, 1)
  await sleep(200)
  await put(ch, 2)
  await sleep(200)
  await put(ch, 3)
})
```

##Type of buffers

###Fixed

A fixed buffer immediately accepts N values. These values release their ```put```s and queue up waiting for a respective ```take```.
When it has reached N values, it begins to queue up and will park an async functions until there is space for them.

```javascript
import channels from 'channels'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan(2)

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  await put(ch, 3)

  console.log('finally, 3 added to buffer')
})

go(async function() {

  await timeout(1000)

  // this take() will create room for the 3
  await take(ch)
})
```

###Dropping

This is just like the fixed buffer, except
it actually drops (ignores) any excess ```put```s.

```javascript
var ch = chan(buffers.dropping(2))

go(async function() {
  await sleep(1000)
  console.log('waited a second')
  console.log('this should be a 1:', await take(ch))
  console.log('this should be a 2:', await take(ch))
  await take(ch)
  console.log('this will just be queued, because the three was dropped and there are no pending puts')

})

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  console.log('this 3 gets dropped')
  await put(ch, 3)
  console.log('and is released immediately')
})
```

###Sliding

This is just like the fixed buffer, except
it will push a new ```put``` value while simultaneously dropping the oldest ```put``` value.

```javascript
import channels from 'channels'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan(buffers.sliding(2))

go(async function() {
  await sleep(1000)
  console.log('waited a second')
  console.log('this should be a 2:', await take(ch))
  console.log('this should be a 3:', await take(ch))
})

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  console.log('this 3 gets slid into the last spot, dropping the first (1)')
  await put(ch, 3)
  console.log('and is released immediately')

})
```

##Advanced

###Transducers
You can use transducers!

```javascript
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
```

###Pipe

```javascript
import channels from '../lib/index'
import t from 'transducers-js'

var { go, chan, take, put, ops } = channels
var pipe = ops.pipe

var isEven = (n) => n % 2 === 0
var inc = (n) => n + 1

var ch1 = chan()
var ch2 = chan(10, t.filter(isEven))
var ch3 = chan(10, t.map(inc))
pipe(ch1, ch2)
pipe(ch2, ch3)

go(async function() {
  while (true) {
    // will log 3, 5
    console.log(await take(ch3))
  }
})

put(ch1, 1)
put(ch1, 2)
put(ch1, 3)
put(ch1, 4)
put(ch1, 5)
```

###Mult

```javascript
import channels from '../lib/index'

var { go, chan, take, put, ops } = channels
var mult = ops.mult

var ch1 = mult(chan())
var ch2 = chan()
var ch3 = chan()

mult.tap(ch1, ch2)
mult.tap(ch1, ch3)

go(async function() {
  while (true) {
    // will log 1, 2, 3, 4, 5
    console.log(await take(ch2))
  }
})

go(async function() {
  while (true) {
    // will log 1, 2, 3, 4, 5
    console.log(await take(ch3))
  }
})

put(ch1, 1)
put(ch1, 2)
put(ch1, 3)
put(ch1, 4)
put(ch1, 5)
