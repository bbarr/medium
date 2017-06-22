
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const express = require('express')
const { chan, put, take, repeatTake, sleep, CLOSED } = require('../../build/index')

const buffer = require('./persistent_buffer')

const pendingJobs = chan(buffer('pending_job'))
const completedJobs = chan(buffer('completed_job'))

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) cluster.fork()

  "abcdefghijklmnopqrstuvwxyz".split('').forEach(char => {
    put(pendingJobs, char)
  })

  repeatTake(completedJobs, async (char, current) => {

    const next = current + char

    if (next.length === 26) {
      console.log('gathered all the letters back in somewhat random order', next)
      return CLOSED
    }

    return next 
  }, '')

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  })

} else {
  console.log(`Worker ${process.pid} started`);

  repeatTake(pendingJobs, async (char) => {

    console.log(`${process.pid} working on char`, char)

    // emulate the performing of some task, 
    // like, say, uppercasing the given character
    await sleep(1000)
    put(completedJobs, char.toUpperCase())
  })
}
