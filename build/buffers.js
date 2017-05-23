//      

const base = ()          => ({
	unreleased: [],
	push(put) {
		this.unreleased.push(put)
	},
	shift() {
		return this.unreleased.shift()
	},
	isEmpty() { return !this.unreleased.length }
})

const fixed = (limit        )          => ({
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
})

const dropping = (limit        )          => ({
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
})

const sliding = (limit        )          => ({
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
})

module.exports = {
  base,
  fixed,
  dropping,
  sliding
}
