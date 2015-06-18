
function transformer() {
  return {
    "@@transducer/init"() { throw new Error('init not available') },
    "@@transducer/result"(v) { return v },
    '@@transducer/step'(arr, input) { 
      arr.push(input)
      return arr 
    }
  }
}

export default {

  transformer,

  transform(xduce) {
    return xduce ? xduce(transformer()) : transformer()
  },

  apply(xduce, val) {
    return xduce['@@transducer/step']([], val)[0]
  }
}
