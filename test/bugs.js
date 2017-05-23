
const assert = require('assert')
const { chan, put, sleep, go, any } = require('../build/index')


describe('bugs reports', () => {

  describe('https://github.com/bbarr/medium/issues/3', () => {

    it('should resolve ch1 put of 123', (cb) => {

      const channel = chan()

      go(async () => {

        const ch1 = chan()
        const p = sleep(100)

        put(ch1, 123)

        const [ v, ch ] = await any(ch1, p)

        assert.equal(v, 123)
      }).then(cb)
    })
  })
})

