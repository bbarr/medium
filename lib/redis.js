
const kue = require('kue')
const queue = kue.createQueue()

module.exports = () => {

  return {

    async take(id) {
      return new Promise(res => {
        queue.process(id, (job, ctx, done) => {
          ctx.shutdown()
          res(JSON.parse(job.data))
        })
      })
    },

    async put(id, data) {
      return new Promise(res => {
        const job = queue.create(id, JSON.stringify(data)).save()
        job.on('start', res)
      })
    }
  }
}
