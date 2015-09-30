"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function transformer() {
  return {
    "@@transducer/init": function transducerInit() {
      throw new Error("init not available");
    },
    "@@transducer/result": function transducerResult(v) {
      return v;
    },
    "@@transducer/step": function transducerStep(arr, input) {
      arr.push(input);
      return arr;
    }
  };
}

exports["default"] = {

  transformer: transformer,

  transform: function transform(xduce) {
    return xduce ? xduce(transformer()) : transformer();
  },

  apply: function apply(xduce, val) {
    return xduce["@@transducer/step"]([], val)[0];
  }
};
module.exports = exports["default"];