'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CLOSED = exports.clone = undefined;
exports.chan = chan;
exports.take = take;
exports.put = put;
exports.cancel = cancel;
exports.close = close;
exports.go = go;
exports.sleep = sleep;
exports.repeat = repeat;
exports.repeatTake = repeatTake;
exports.merge = merge;
exports.any = any;

var _buffers = require('./buffers');

var buffers = _interopRequireWildcard(_buffers);

var _transducer_support = require('./transducer_support');

var _transducer_support2 = _interopRequireDefault(_transducer_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// CORE

function chan(bufferOrN, xduce) {
  var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];


  var buffer = typeof bufferOrN === 'number' ? buffers.fixed(bufferOrN) : bufferOrN || buffers.base();

  var ch = {
    isClosed: false,
    args: arguments,
    opts: opts,
    takes: [],
    xduce: _transducer_support2.default.transform(xduce),
    buffer: buffer,
    then: function then(x, y) {
      return take(ch).then(x, y);
    }
  };

  return ch;
}

// Channel -> Promise
function take(ch) {

  var take = createAction();

  if (ch.isClosed) {
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

// Channel -> Any -> Promise
function put(ch, v) {

  var put = createAction({ payload: v });

  if (ch.isClosed) {
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

// @TODO improve
// Takes channel and a promise from a previous put/take. Cancels it.
// Channel -> Promise
function cancel(ch, promise) {

  // cancel takes
  var pendingTakeI = findIndexByProp('promise', promise, ch.takes);
  if (isDefined(pendingTakeI)) ch.takes.splice(pendingTakeI, 1);

  // cancel puts
  var pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased);
  if (isDefined(pendingPutI) && ch.buffer.unreleased) ch.buffer.unreleased.splice(pendingPutI, 1);
}

// Channel -> Channel
function close(ch) {
  var currPut;
  while (currPut = ch.buffer.shift()) {
    currPut.resolve(false);
  }
  ch.takes.forEach(function (t) {
    return t.resolve(CLOSED);
  });
  ch.isClosed = true;
  return ch;
}

// Channel -> Action -> Action
function run(ch, put, take) {
  take.resolve(put.payload);
  put.resolve(true);
}

// AsyncFunction -> Promise
function go(afn) {
  return afn();
}

// Number -> Promise
function sleep(ms) {
  return new Promise(function (res) {
    setTimeout(res, ms);
  });
}

// Channel -> Channel
var clone = exports.clone = function clone(src) {
  return chan.apply(undefined, _toConsumableArray(src.args));
};

// AsyncFunction -> Any -> Promise
function repeat(afn, seed) {
  var _this = this;

  return go(_asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    var result;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            result = seed;

          case 1:
            if (!(result !== false)) {
              _context.next = 7;
              break;
            }

            _context.next = 4;
            return afn(result);

          case 4:
            result = _context.sent;
            _context.next = 1;
            break;

          case 7:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, _this);
  })));
}

// Channel -> AsyncFunction -> Any -> Promise
function repeatTake(ch, afn, seed) {
  var _this2 = this;

  return go(_asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var result, item;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            result = seed;

          case 1:
            if (!(result !== false)) {
              _context2.next = 10;
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
            _context2.next = 1;
            break;

          case 10:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, _this2);
  })));
}

// ...Channel -> Channel
function merge() {
  var _this3 = this;

  for (var _len = arguments.length, chs = Array(_len), _key = 0; _key < _len; _key++) {
    chs[_key] = arguments[_key];
  }

  var out = chan();
  var closedCount = 0;

  chs.forEach(function (ch) {
    repeatTake(ch, function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(v) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!(v === CLOSED)) {
                  _context3.next = 4;
                  break;
                }

                closedCount++;
                if (closedCount === chs.length) close(out);
                return _context3.abrupt('return', false);

              case 4:
                put(out, v);

              case 5:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, _this3);
      }));

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    }());
  });

  return out;
}

// AnyInput -> Promise
function any() {
  var _this4 = this;

  for (var _len2 = arguments.length, ports = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    ports[_key2] = arguments[_key2];
  }

  var alreadyReady = ports.filter(isResolvable);

  if (alreadyReady.length > 0) return resolveLazyPuts(random(alreadyReady));

  return new Promise(function (res) {

    var promises = [];
    ports.forEach(function (port, i) {
      go(_asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var promise;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                promise = resolveLazyPuts(port);

                promises.push(promise);
                _context4.next = 4;
                return promise;

              case 4:
                _context4.t0 = _context4.sent;
                res(_context4.t0);


                // cancel all other cancelable actions!
                ports.forEach(function (p) {
                  if (p === port) return;
                  if (isPromise(port)) return;
                  cancel(p[0] || p, promises[i]);
                });

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this4);
      })));
    });
  });
}

// HELPERS

var CLOSED = exports.CLOSED = Symbol('MEDIUM_CLOSED');
var isChan = function isChan(obj) {
  return !!obj && !!obj.buffer && !!obj.then;
};
var random = function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};
var isDefined = function isDefined(a) {
  return typeof a !== 'undefined';
};
var isPromise = function isPromise(port) {
  return port instanceof Promise;
};
var isPut = function isPut(port) {
  return Array.isArray(port);
};

var isResolvable = function isResolvable(port) {
  if (isPromise(port)) return false;
  if (isChan(port)) return !port.buffer.isEmpty();
  if (isPut(port)) return !!port[0].takes.length;
  return false;
};

var resolveLazyPuts = function resolveLazyPuts(port) {
  if (!isPut(port)) return port.then(function (v) {
    return [v, port];
  });
  return put(port[0], port[1]).then(function (v) {
    return [v, port[0]];
  });
};

var createAction = function createAction() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _resolve = void 0;
  return {
    payload: config.payload,
    resolve: function resolve(payload) {
      return _resolve(payload);
    },
    promise: new Promise(function (res) {
      return _resolve = res;
    })
  };
};

// ugly for speed
var findIndexByProp = function findIndexByProp(key, val) {
  var arr = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  for (var i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i;
  }
  return -1;
};