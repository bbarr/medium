
// @flow

const { go, chan, take, put, sleep, buffers } = require('../../lib/index')
const kue = require('kue')

const redisBuffer = () : Buffer => ({

  push(put) {

  },

  isEmpty() {
    return false
  },

  shift() {
  }
})
