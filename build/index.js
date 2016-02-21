'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.any = exports.CLOSED = undefined;
exports.chan = chan;
exports.take = take;
exports.put = put;
exports.cancel = cancel;
exports.close = close;
exports.go = go;
exports.sleep = sleep;
exports.clone = clone;
exports.repeat = repeat;
exports.repeatTake = repeatTake;
exports.merge = merge;

var _buffers = require('./buffers');

var _buffers2 = _interopRequireDefault(_buffers);

var _transducer_support = require('./transducer_support');

var _transducer_support2 = _interopRequireDefault(_transducer_support);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// helpers
var isChan = function isChan(obj) {
  return obj[IS_CHANNEL];
};
var random = function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
};
var isDefined = function isDefined(a) {
  return typeof a !== 'undefined';
};
var findIndexByProp = function findIndexByProp(key, val, arr) {
  for (var i = 0, len = arr.length; i < len; i++) {
    if (arr[i][key] === val) return i;
  }
};

var CLOSED = exports.CLOSED = Symbol('medium-closed-state');
var IS_CHANNEL = Symbol('is-channel');

// CORE
function chan(bufferOrN) {
  var _ch;

  var xduce = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
  var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];


  var buffer = typeof bufferOrN === 'number' ? _buffers2.default.fixed(bufferOrN) : bufferOrN || _buffers2.default.base();

  var ch = (_ch = {}, _defineProperty(_ch, IS_CHANNEL, true), _defineProperty(_ch, 'args', arguments), _defineProperty(_ch, 'opts', opts), _defineProperty(_ch, 'closed', false), _defineProperty(_ch, 'takes', []), _defineProperty(_ch, 'xduce', _transducer_support2.default.transform(xduce)), _defineProperty(_ch, 'buffer', buffer), _defineProperty(_ch, 'then', function then(x, y) {
    return take(ch).then(x, y);
  }), _ch);

  return ch;
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

// @TODO improve
function cancel(ch, promise) {

  var pendingTakeI = findIndexByProp('promise', promise, ch.takes);
  var pendingPutI = findIndexByProp('promise', promise, ch.buffer.unreleased);

  if (isDefined(pendingTakeI)) ch.takes.splice(pendingTakeI, 1);
  if (isDefined(pendingPutI) && ch.buffer.unreleased) ch.buffer.unreleased.splice(pendingPutI, 1);
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


  var _resolve = undefined;

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

function merge() {
  var _this3 = this;

  for (var _len = arguments.length, chs = Array(_len), _key = 0; _key < _len; _key++) {
    chs[_key] = arguments[_key];
  }

  var out = chan();
  var closedCount = 0;

  chs.forEach(function (ch) {
    repeatTake(ch, function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(v) {
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
      })),
          _this = _this3;

      return function (_x4) {
        return ref.apply(_this, arguments);
      };
    }());
  });

  return out;
}

// @TODO improve
var any = exports.any = function () {

  var isTake = isChan;
  var isPromise = function isPromise(port) {
    return port instanceof Promise;
  };
  var isPut = function isPut(port) {
    return Array.isArray(port);
  };

  var isResolvable = function isResolvable(port) {
    if (isPromise(port)) return false;
    if (isTake(port)) return !port.buffer.isEmpty();
    if (isPut(port)) return port[0].takes.length;
  };

  var format = function format(port) {
    if (!isPut(port)) return port.then(function (v) {
      return [v, port];
    });
    return put(port[0], port[1]).then(function (v) {
      return [v, port[0]];
    });
  };

  return function () {
    for (var _len2 = arguments.length, ports = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      ports[_key2] = arguments[_key2];
    }

    var promises = [];
    var alreadyReady = ports.filter(isResolvable);

    if (alreadyReady.length > 0) return format(random(alreadyReady));

    return new Promise(function (res) {

      ports.forEach(function (port, i) {
        go(_asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
          var promise;
          return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  promise = format(port);

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
          }, _callee4, undefined);
        })));
      });
    });
  };
}();