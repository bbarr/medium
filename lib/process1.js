
const { File, go } = require('./index')

go(async () => {
  console.log('about to take from file queue')
  const taken = await File.take('a')
  console.log('took!', taken)
})
