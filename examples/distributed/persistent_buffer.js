
const kue = require('kue')
const q = kue.createQueue()

module.exports = qName => ({

  isEmpty() {
    return new Promise((res, rej) => {
      q.inactiveCount((e, total) => {
        res(total === 0)
      })
    })
  },

  push(put) {
    const job = q
      .create(qName, { payload: put.payload })
      .removeOnComplete(true)
      .save(() => put.resolve(true))
  },

  shift() {
    return new Promise((res, rej) => {
      q.process(qName, 1, (job, done) => {
        res(job.data) 
        done()
      })
    })
  }
})
