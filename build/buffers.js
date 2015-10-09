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
    },
    isEmpty: function isEmpty() {
      return !this.unreleased.length;
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
    },
    isEmpty: function isEmpty() {
      return !this.released.length;
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
    },
    isEmpty: function isEmpty() {
      return !this.released.length;
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
    },
    isEmpty: function isEmpty() {
      return !this.released.length;
    }
  };
}

exports["default"] = { base: base, fixed: fixed, dropping: dropping, sliding: sliding };
module.exports = exports["default"];