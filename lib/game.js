
// start!

const createRedisChannel = require('./redis')

const { put } = createRedisChannel()

put('table', 0)
