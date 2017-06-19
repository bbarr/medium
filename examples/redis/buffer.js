
const kue = require('kue')
const q = kue.createQueue()

module.exports = qName => ({

  isEmpty() {
    return false
  },

  push(put) {
    put._buffer_id = Math.round(Math.random() * 100000)
    q.create(qName, { id: put._buffer_id, payload: put.payload }).save((e) => {
      put.resolve(true)
    })
  },

  shift() {
    return new Promise((res, rej) => {
      q.process(qName, 1, (job, done) => {
        const put = job.data
        res(put) 
      })
    })
  }
})
