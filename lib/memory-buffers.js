
module.exports = {

  fixed: (n=1) => () => {
    let released = []
    let unreleased = []
    return {
      release() {

      },
      put(putAction) {
        if (unreleased.length < n) {
          
        }
      },
      take(takeAction) {

      }
    }
  }
}
