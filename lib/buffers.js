

function base() {
	return {
		unreleased: [],
		push(put) {
			this.unreleased.push(put)
		},
		shift() {
			return this.unreleased.shift()
		}
	}
}

function fixed(limit) {
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
			var next = this.released.shift()
			if (!next) return
			var waiting = this.unreleased.shift()
			if (!waiting) return
			this.release(waiting)
		}
	}
}

function dropping(limit) {
	return {
		limit: limit,
		strategy: 'dropping'
	}
}

function sliding(limit) {
	return {
		limit: limit,
		strategy: 'sliding'
	}
}

export default { base, fixed, dropping, sliding }