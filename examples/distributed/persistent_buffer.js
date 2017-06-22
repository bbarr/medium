
const Queue = require('bull')
const { chan, take, put } = require('../../build/index')

module.exports = qName => {

  const q = new Queue(qName)

  return ({

    isEmpty() {
      return q.count()
    },

    async push(put) {
      await q.add({ payload: put.payload }, { removeOnComplete: true })
      put.resolve(true)
    },

    shift: (() => {

      const processed = chan()
      let first = true

      return () => {

        if (first) {
          first = false
          q.process(async (job) => {
            console.log('processing (pushing to buffer)', job.data)
            await put(processed, job.data)
          })
        }

        return take(processed)
      }
    })()
  })
}
