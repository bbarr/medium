'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CLOSED = undefined;
exports.chan = chan;
exports.take = take;
exports.put = put;
exports.close = close;
exports.go = go;
exports.sleep = sleep;
exports.clone = clone;
exports.repeat = repeat;
exports.repeatTake = repeatTake;
exports.any = any;

var _buffers = require('./buffers');

var _buffers2 = _interopRequireDefault(_buffers);

var _transducer_support = require('./transducer_support');

var _transducer_support2 = _interopRequireDefault(_transducer_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var CLOSED = exports.CLOSED = 'medium-closed-state';

// CORE
function chan(bufferOrN) {
  var xduce = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var buffer = typeof bufferOrN === 'number' ? _buffers2.default.fixed(bufferOrN) : bufferOrN || _buffers2.default.base();

  return {
    args: arguments,
    opts: opts,
    closed: false,
    takes: [],
    xduce: _transducer_support2.default.transform(xduce),
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
  put.payload = _transducer_support2.default.apply(ch.xduce, put.payload);
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
  return new Promise(function (res) {
    setTimeout(res, ms);
  });
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
    promise: new Promise(function (res) {
      return _resolve = res;
    })
  };
}

function repeat(afn, seed) {
  var _this = this;

  go(_asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    var result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            result = seed;

          case 1:
            if (!true) {
              _context.next = 9;
              break;
            }

            _context.next = 4;
            return afn(result);

          case 4:
            result = _context.sent;

            if (!(result === false)) {
              _context.next = 7;
              break;
            }

            return _context.abrupt('break', 9);

          case 7:
            _context.next = 1;
            break;

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, _this);
  })));
}

function repeatTake(ch, afn, seed) {
  var _this2 = this;

  go(_asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var result, item;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            result = seed;

          case 1:
            if (!true) {
              _context2.next = 12;
              break;
            }

            _context2.next = 4;
            return take(ch);

          case 4:
            item = _context2.sent;
            _context2.next = 7;
            return afn(item, result);

          case 7:
            result = _context2.sent;

            if (!(result === false)) {
              _context2.next = 10;
              break;
            }

            return _context2.abrupt('break', 12);

          case 10:
            _context2.next = 1;
            break;

          case 12:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, _this2);
  })));
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

  return new Promise(function (res) {
    chs.forEach(function (ch) {
      go(_asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var val;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return take(ch);

              case 2:
                val = _context3.sent;

                res([val, ch]);
                close(ch);

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, _this3);
      })));
    });
  });
}