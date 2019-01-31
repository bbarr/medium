
async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

function go(afn) { 
  return afn() 
}

// core queue for coordinating locally
const Memory = {

  queues: {},
  takes: [],
  puts: [],

  async take(id) {
    let queue = Memory.queues[id]
    while (!queue || queue.length === 0) {
      await sleep(500)
      queue = Memory.queues[id]
    }
    return queue.shift()
  },

  async put(id, data) {
    const queue = (Memory.queues[id] || (Memory.queues[id] = []))
    queue.push(data)
    while (queue.length > 0) {
      await sleep(500)
    }
  }
}

const File = (() => {

  const fs = require('fs')
  const readJSON = path => 
    new Promise((res, rej) => { 
      fs.readFile(path, 'utf8', (e, data) => {
        e ? rej() : res(JSON.parse(data))
      })
    }) 
  const writeJSON = (path, data) => 
    new Promise(res => fs.writeFile(path, JSON.stringify(data), res))
  const readQueues = readJSON.bind(null, `${__dirname}/tmp-queues.json`)
  const writeQueues = writeJSON.bind(null, `${__dirname}/tmp-queues.json`)

  // ensure tmp files are initialized
  readQueues().catch(() => writeQueues({}))

  return {

    async take(id) {
      let queues = await readQueues()
      let queue = queues[id]
      while (!queue || queue.length === 0) {
        await sleep(500)
        queues = await readQueues()
        queue = queues[id]
      }
      const value = queue.shift()
      await writeQueues(queues)
      return value
    },

    async put(id, data) {
      let queues = await readQueues()
      let queue = queues[id]
      if (!queue) {
        queue = queues[id] = []
        await writeQueues(queues)
      }
      while (queue.length > 0) {
        await sleep(500)
        queues = await readQueues()
        queue = queues[id]
      }
      queue.push(data)
      await writeQueues(queues)
    }
  }
})()

module.exports = {
  File,
  Memory,
  go
}
