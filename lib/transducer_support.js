// @flow

function transformer() : any {
  return {
    "@@transducer/init"() : void { throw new Error('init not available') },
    "@@transducer/result"(v: any) : any { return v },
    '@@transducer/step'(arr: Array<any>, input: any) : Array<any> { 
      arr.push(input)
      return arr
    }
  }
}

module.exports = {

  transformer,

  transform(xduce: any) : Object {
    return xduce ? xduce(transformer()) : transformer()
  },

  apply(xduce: any, val: any) {
    return xduce['@@transducer/step']([], val)[0]
  }
}
