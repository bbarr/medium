
export default {

	once(fn) {
		var called = false
		return function() {
			if (called) return
			called = true
			fn.apply(null, arguments)
		}
	}
}
