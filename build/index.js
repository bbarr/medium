'use strict';

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

var _util = require('./util');

var _util2 = _interopRequireDefault(_util);

var CLOSED = 'medium-closed-state';

// CORE
function chan(bufferOrN, xduce) {

  var buffer = typeof bufferOrN === 'number' ? _buffers2['default'].fixed(bufferOrN) : bufferOrN || _buffers2['default'].base();

  return {
    args: arguments,
    closed: false,
    takes: [],
    xduce: _transducer_support2['default'].transform(xduce),
    buffer: buffer,
    downstream: [],
    taps: [],
    piped: []
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
  ch.closed = true;
  ch.downstream.forEach(close);
  ch.takes.forEach(function (t) {
    return t.resolve(CLOSED);
  });
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false);
  }
}

// UTILITIES
function go(afn) {
  return afn();
}

function sleep(ms) {
  return new _Promise(function (res) {
    return setTimeout(res.bind(null, true), ms);
  });
}

function clone(ch) {
  return chan.apply(null, ch.args);
}

function run(ch, put, take) {
  take.resolve(put.payload);
  put.resolve(true);
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

// OPERATIONS
function pipe(from, to, opts) {
  from.piped.push([to, opts]);
  from.downstream.push(to);
  go(function callee$1$0() {
    var current;
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          if (!true) {
            context$2$0.next = 10;
            break;
          }

          context$2$0.next = 3;
          return _regeneratorRuntime.awrap(take(from));

        case 3:
          current = context$2$0.sent;

          if (!(current === CLOSED)) {
            context$2$0.next = 6;
            break;
          }

          return context$2$0.abrupt('break', 10);

        case 6:
          context$2$0.next = 8;
          return _regeneratorRuntime.awrap(put(to, current));

        case 8:
          context$2$0.next = 0;
          break;

        case 10:
        case 'end':
          return context$2$0.stop();
      }
    }, null, this);
  });
}

function mult(src) {
  var ch = clone(src);
  go(function callee$1$0() {
    var current, i, result;
    return _regeneratorRuntime.async(function callee$1$0$(context$2$0) {
      while (1) switch (context$2$0.prev = context$2$0.next) {
        case 0:
          if (!true) {
            context$2$0.next = 17;
            break;
          }

          context$2$0.next = 3;
          return _regeneratorRuntime.awrap(take(ch));

        case 3:
          current = context$2$0.sent;

          if (!(current === CLOSED)) {
            context$2$0.next = 6;
            break;
          }

          return context$2$0.abrupt('break', 17);

        case 6:
          i = 0;

        case 7:
          if (!(i < ch.taps.length)) {
            context$2$0.next = 15;
            break;
          }

          context$2$0.next = 10;
          return _regeneratorRuntime.awrap(put(ch.taps[i][0], current));

        case 10:
          result = context$2$0.sent;

          if (result === false) mult.untap(src, ch.taps[i][0]);

        case 12:
          i++;
          context$2$0.next = 7;
          break;

        case 15:
          context$2$0.next = 0;
          break;

        case 17:
        case 'end':
          return context$2$0.stop();
      }
    }, null, this);
  });
  return ch;
}

mult.tap = function (src, dest, opts) {
  src.taps.push([dest, opts]);
  src.downstream.push(dest);
};

mult.untap = function (src, dest) {
  _util2['default'].findAndRemoveChannelWithOpts(src.taps, dest);
  src.downstream.splice(src.downstream.indexOf(dest), 1);
};

// API
exports['default'] = {
  CLOSED: CLOSED,
  go: go,
  sleep: sleep,
  close: close,
  put: put,
  take: take,
  buffers: _buffers2['default'],
  chan: chan,
  ops: {
    pipe: pipe,
    mult: mult
  }
};
module.exports = exports['default'];