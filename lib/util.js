
export default {

  findAndRemoveChannelWithOpts(arr, target) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i][0] === target) {
        arr.splice(i, 1)
        break
      }
    }
  },

  once(fn) {
    var called = false
    return function() {
      if (called) return
      called = true
      fn.apply(null, arguments)
    }
  }
}
