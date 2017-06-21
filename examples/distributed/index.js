
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
const express = require('express')
const { chan, put, take } = require('medium')

const buffer = require('./persistent_buffer')
const rawTextChan = chan(buffer)
const statsChan = chan(buffer)

const app = express()

if (cluser.isMaster) {

  let id = 0

  for (let i = 0; i < numCPUs; i++) 
    cluster.fork()
  
  app.get('/stats', (req, res) => {
    const text = req.query.text
    put(rawTextChan, { id: id++, text })
  })
  
} else {

  repeatTake(rawTextChan, 
}
