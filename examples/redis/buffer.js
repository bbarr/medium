
const kue = require('kue')
const q = kue.createQueue()

module.exports = qName => ({

  isEmpty() {
    return false
  },

  push(put) {
    q.create(qName, { payload: put.payload }).save((e) => {
      put.resolve(true)
    })
  },

  shift() {
    return new Promise((res, rej) => {
      q.process(qName, 1, (job, done) => {
        res(put.data) 
      })
    })
  }
})
