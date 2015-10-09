'use strict';

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _regeneratorRuntime = require('babel-runtime/regenerator')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _buffers = require('./buffers');

var _buffers2 = _interopRequireDefault(_buffers);

var _transducer_support = require('./transducer_support');

var _transducer_support2 = _interopRequireDefault(_transducer_support);

var CLOSED = 'medium-closed-state';

// CORE
function chan(bufferOrN) {
  var xduce = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var buffer = typeof bufferOrN === 'number' ? _buffers2['default'].fixed(bufferOrN) : bufferOrN || _buffers2['default'].base();

  return {
    args: arguments,
    opts: opts,
    closed: false,
    takes: [],
    xduce: _transducer_support2['default'].transform(xduce),
    buffer: buffer
  };
}

function take(ch) {

  var take = createAction();

  if (ch.closed) {
    take.resolve(CLOSED);
    return take.promise;
  }

  var put = ch.buffer.shift();
  if (put) {
    run(ch, put, take);
  } else {
    ch.takes.push(take);
  }

  return take.promise;
}

function put(ch, v) {

  var put = createAction({ payload: v });

  if (ch.closed) {
    put.resolve(false);
    return put.promise;
  }

  // handle transducer
  put.payload = _transducer_support2['default'].apply(ch.xduce, put.payload);
  if (typeof put.payload === 'undefined') {
    put.resolve(true);
    return put.promise;
  }

  var take = ch.takes.shift();
  if (take) {
    run(ch, put, take);
  } else {
    ch.buffer.push(put);
  }

  return put.promise;
}

function close(ch) {
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false);
  }
  ch.takes.forEach(function (t) {
    return t.resolve(CLOSED);
  });
  ch.closed = true;
}

function run(ch, put, take) {
  take.resolve(put.payload);
  put.resolve(true);
}

// UTILITIES
function go(afn) {
  return afn();
}

function sleep(ms) {
  var ch = chan();
  setTimeout(function () {
    return put(ch, true);
  }, ms);
  return ch;
}

function clone(src) {
  return chan.apply(undefined, _toConsumableArray(src.args));
}

function createAction() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _resolve;

  return {
    payload: config.payload,
    resolve: function resolve(payload) {
      return _resolve(payload);
    },
    promise: new _Promise(function (res) {
      return _resolve = res;
    })
  };
}

function repeat(afn, seed) {
  var _this = this;

  go(function callee$1$0() {
    var result;
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          result = seed;

        case 1:
          if (!true) {
            context$2$0.next = 9;
            break;
          }

          context$2$0.next = 4;
          return _regeneratorRuntime.awrap(afn(result));

        case 4:
          result = context$2$0.sent;

          if (!(result === false)) {
            context$2$0.next = 7;
            break;
          }

          return context$2$0.abrupt('break', 9);

        case 7:
          context$2$0.next = 1;
          break;

        case 9:
        case 'end':
          return context$2$0.stop();
      }
    }, null, _this);
  });
}

function repeatTake(ch, afn, seed) {
  var _this2 = this;

  go(function callee$1$0() {
    var result, item;
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          result = seed;

        case 1:
          if (!true) {
            context$2$0.next = 12;
            break;
          }

          context$2$0.next = 4;
          return _regeneratorRuntime.awrap(take(ch));

        case 4:
          item = context$2$0.sent;
          context$2$0.next = 7;
          return _regeneratorRuntime.awrap(afn(item, result));

        case 7:
          result = context$2$0.sent;

          if (!(result === false)) {
            context$2$0.next = 10;
            break;
          }

          return context$2$0.abrupt('break', 12);

        case 10:
          context$2$0.next = 1;
          break;

        case 12:
        case 'end':
          return context$2$0.stop();
      }
    }, null, _this2);
  });
}

function any() {
  var _this3 = this;

  for (var _len = arguments.length, chs = Array(_len), _key = 0; _key < _len; _key++) {
    chs[_key] = arguments[_key];
  }

  var ready = chs.filter(function (ch) {
    return !ch.buffer.isEmpty();
  });
  var format = function format(ch) {
    return take(ch).then(function (val) {
      return [val, ch];
    });
  };

  if (ready.length === 1) {
    return format(ready[0]);
  }

  if (ready.length > 1) {
    return format(ready[Math.floor(Math.random() * ready.length)]);
  }

  return new _Promise(function (res) {
    chs.forEach(function (ch) {
      go(function callee$3$0() {
        var val;
        return _regeneratorRuntime.async(function callee$3$0$(context$4$0) {
          while (1) switch (context$4$0.prev = context$4$0.next) {
            case 0:
              context$4$0.next = 2;
              return _regeneratorRuntime.awrap(take(ch));

            case 2:
              val = context$4$0.sent;

              res([val, ch]);
              close(ch);

            case 5:
            case 'end':
              return context$4$0.stop();
          }
        }, null, _this3);
      });
    });
  });
}

// API
exports['default'] = {
  CLOSED: CLOSED,
  go: go,
  sleep: sleep,
  close: close,
  put: put,
  take: take,
  clone: clone,
  buffers: _buffers2['default'],
  chan: chan,
  repeat: repeat,
  repeatTake: repeatTake,
  any: any
};
module.exports = exports['default'];