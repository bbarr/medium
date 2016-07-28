
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

export default {

  transformer,

  transform(xduce: ?Function) : Object {
    return xduce ? xduce(transformer()) : transformer()
  },

  apply(xduce, val) {
    return xduce['@@transducer/step']([], val)[0]
  }
}
