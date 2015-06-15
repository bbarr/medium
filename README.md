# channels
CSP-style channel library using ES7 async/await keywords

###Work in progress - Not stable!

##An example

```javascript

import channels from 'channels'

var { go, chan, take, put, sleep } = channels

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
