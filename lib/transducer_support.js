// @flow

function transformer() {
  return {
    "@@transducer/init"() { throw new Error('init not available') },
    "@@transducer/result"(b) { return v },
    '@@transducer/step'(arr, input) { 
      arr.push(input)
      return arr
    }
  }
}

module.exports = {

  transformer,

  transform(xduce) {
    return xduce ? xduce(transformer()) : transformer()
  },

  apply(xduce, val) {
    return xduce['@@transducer/step']([], val)[0]
  }
}
