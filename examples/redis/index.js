
const cluster = require('cluster')
const numCPUs = require('os').cpus().length

const { go, chan, take, put, sleep, repeatTake } = require('../../build/index')
const buffer = require('./buffer')

const pendingJobs = chan(buffer('pending_job'))
const completedJobs = chan(buffer('completed_job'))

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  "abcdefghijklmnopqrstuvwxyz".split('').forEach(word => {
    put(pendingJobs, word)
  })

  repeatTake(completedJobs, (job) => {
    console.log('Job done!', job)
  })

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });

} else {
  console.log(`Worker ${process.pid} started`);

  repeatTake(pendingJobs, async (job) => {
    console.log(`${process.pid} working on job...`, job)
    await sleep(1000)
    await put(completedJobs, job)
  })
}
