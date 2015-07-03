# Medium
CSP-style channel library using ES7 async/await keywords

####Installation

```javascript
npm install medium
```

You will need to use BabelJS, of course, to add ES7 support to your project.

####Why another CSP library?
There is currently only one with any traction ([js-csp](https://github.com/ubolonton/js-csp)), so another interpretation is a chance to view the subject from a different angle. Specifically, Medium tries to take CSP further into the future by embracing ES7 async/await as well as the trend towards choosing promises over callbacks. Relying on promises means that we can easily interact with other generator libraries, such as Koa.

####What the heck is CSP? What are channels?
I am hoping to write a bit more on this sometime, but for now, there are loads of great articles by smarter people than me, explaining the ins and outs, as well as the motivation of using "Communicating Sequential Processes".

* [CSP and transducers in JavaScript](http://phuu.net/2014/08/31/csp-and-transducers.html)
* [Taming the Asynchronous Beast with CSP Channels in JavaScript](http://jlongster.com/Taming-the-Asynchronous-Beast-with-CSP-in-JavaScript)
* Check out the documentation at the above mentioned js-csp library. Different implementation, but the API and core principles are quite aligned.

####Let's, start with a trivial example

```javascript

import channels from 'channels'

var { go, chan, take, put, sleep } = channels

var ch = chan()

go(async function() {
  while (true) {
    // will print 1, wait 200ms, print 2
    console.log(await take(ch))
  }
})

go(async function() {
  await put(ch, 1)
  await sleep(200)
  await put(ch, 2)
})
```

We can also interact with channels outside go/async blocks.

```javascript

import channels from 'channels'

var { chan, take, put } = channels

var ch = chan()

take(ch).then((val) => console.log('taking: ', val))
put(ch, 'hi').then(() => console.log('we put!'))

// will print, in this order:
// 'we put!'
// 'taking: hi'
```

####Buffers
By default, a channel will block a put until a corrosponding take shows up. Buffers are a way to define different strategies for handling this behavior.

####Fixed

A fixed buffer immediately accepts N puts. These ```put``` actions have their promises resolved with ```true``` and queue up their value for a respective ```take```.
When it has reached N values, it begins to buffer and will park a ```put``` action until there is space for its value.

```javascript
import channels from 'channels'

var { go, chan, take, put, sleep, buffers } = channels

var ch = chan(buffers.fixed(2)) // alias chan(2)

go(async function() {

  await put(ch, 1)
  await put(ch, 2)

  console.log('buffer full...')

  await put(ch, 3)

  console.log('finally, 3 added to buffer')
})

go(async function() {

  await sleep(1000)

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
```

##API 

###chan(numOrBuffer, xducer)
###put(ch, val)
###take(ch)
###go(async function)
###sleep(ms)
###close(ch)
###buffers
- unbuffered()
- fixed(num)
- sliding(num)
- dropping(num)

###Ops
- pipe(srcCh, destCh)
- mult(ch)
  - tap(srcCh, destCh)
  - untap(srcCh, destCh)



