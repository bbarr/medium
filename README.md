# Medium
CSP-style channel library using ES7 async/await keywords.

#### Installation

```javascript
npm install medium
```

*This is an experimental rebuild. Channels will always be limited in use as long
as they prevent separate Node processes/servers from communicating with each other.
This branch has code that begins to experiment with a Redis-backed channel buffer.
There is a LOT of missing functionality! Just a start to see how doable this even is.*

#### First, the requisite naive ping/pong example (ported from [Go](https://talks.golang.org/2013/advconc.slide#6))

##### Process #1 (Player 1, same code as player 2)
```javascript

const { go, sleep, CLOSED } = require('./index')
const createRedisChannel = require('./redis')

const { take, put } = createRedisChannel()

go(async () => {
  while (true) {

    const hits = await take('table')
    console.log('player2 hit: ', hits)

    if (hits === CLOSED) break

    await sleep(500)
    const nextHit = hits > 9 ? CLOSED : hits + 1
    await put('table', nextHit)
  }
})
```

##### Process #2 (Player 2, same code as player 1)
```javascript

const { go, sleep, CLOSED } = require('./index')
const createRedisChannel = require('./redis')

const { take, put } = createRedisChannel()

go(async () => {
  while (true) {

    const hits = await take('table')
    console.log('player2 hit: ', hits)

    if (hits === CLOSED) break

    await sleep(500)
    const nextHit = hits > 9 ? CLOSED : hits + 1
    await put('table', nextHit)
  }
})
```

##### Process #3 (Starts the actual game)
```javascript

const createRedisChannel = require('./redis')

const { put } = createRedisChannel()

put('table', 0)

```

To run this example, after switching to this `distributed` branch:
```
node lib/player1.js
node lib/player2.js
node lib/game.js
```

And watch it go! Of course, you could start those processes in any order and it will work.
