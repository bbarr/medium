"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function base() {
  return {
    unreleased: [],
    push: function push(put) {
      this.unreleased.push(put);
    },
    shift: function shift() {
      return this.unreleased.shift();
    }
  };
}

function fixed(limit, xduce) {
  return {
    unreleased: [],
    released: [],
    release: function release(put) {
      this.released.push(put);
      put.resolve(true);
    },
    push: function push(put) {
      if (this.released.length === limit) {
        this.unreleased.push(put);
      } else {
        this.release(put);
      }
    },
    shift: function shift() {
      if (!this.released.length) return;

      var next = this.released.shift();

      var waiting = this.unreleased.shift();
      if (waiting) this.release(waiting);

      return next;
    }
  };
}

function dropping(limit) {
  return {
    released: [],
    push: function push(put) {
      if (this.released.length < limit) {
        this.released.push(put);
      }
      put.resolve(true);
    },
    shift: function shift() {
      return this.released.shift();
    }
  };
}

function sliding(limit) {
  return {
    released: [],
    push: function push(put) {
      if (this.released.length === limit) {
        this.released = this.released.slice(1).concat([put]);
      } else {
        this.released.push(put);
      }
      put.resolve(true);
    },
    shift: function shift() {
      return this.released.shift();
    }
  };
}

exports["default"] = { base: base, fixed: fixed, dropping: dropping, sliding: sliding };
module.exports = exports["default"];