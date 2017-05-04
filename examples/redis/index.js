
// @flow

import { go, chan, take, put, sleep, buffers } from '../../lib/index'

const redisBuffer = () : Buffer => ({

  push(put) {
  },

  isEmpty() {
    return false
  },

  shift() {
  }
})
