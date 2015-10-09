
function base() {
  return {
    unreleased: [],
    push(put) {
      this.unreleased.push(put)
    },
    shift() {
      return this.unreleased.shift()
    },
    isEmpty() { return !this.unreleased.length }
  }
}

function fixed(limit, xduce) {
  return {
    unreleased: [],
    released: [],
    release(put) {
      this.released.push(put)
      put.resolve(true)
    },
    push(put) {
      if (this.released.length === limit) {
        this.unreleased.push(put)
      } else {
        this.release(put)
      }
    },
    shift() {
      if (!this.released.length) return

      var next = this.released.shift()

      var waiting = this.unreleased.shift()
      if (waiting) this.release(waiting)

      return next
    },
    isEmpty() { return !this.released.length }
  }
}

function dropping(limit) {
  return {
    released: [],
    push(put) {
      if (this.released.length < limit) {
        this.released.push(put)
      }
      put.resolve(true)
    },
    shift() {
      return this.released.shift()
    },
    isEmpty() { return !this.released.length }
  }
}

function sliding(limit) {
  return {
    released: [],
    push(put) {
      if (this.released.length === limit) {
        this.released = this.released.slice(1).concat([ put ])
      } else {
        this.released.push(put)
      }
      put.resolve(true)
    },
    shift() {
      return this.released.shift()
    },
    isEmpty() { return !this.released.length }
  }
}

export default { base, fixed, dropping, sliding }
