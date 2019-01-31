
const { File, go } = require('./index')

go(async () => {
  console.log('about to put to file queue')
  await File.put('a', 1)
  console.log('put!')
})
