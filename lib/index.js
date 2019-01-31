
const CLOSED = 'medium-channel-closed'

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms))
}

function go(afn) { 
  return afn() 
}

module.exports = {
  go,
  sleep,
  CLOSED
}
