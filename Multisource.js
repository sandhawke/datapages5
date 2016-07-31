'use strict'

const Filter = require('./Filter')
const debug = require('debug')('Multisource')

class Multisource extends Filter {
  constructor (parent, others) {
    super(parent, { })
    this._others = others || []
  }

  include (source) {
    const self = this
    this._others.push(source)
    for (let event of [
      'appear', 'disappear', 'progress', 'results',
      'update-before', 'update-full', 'update-after', 'update-property',
      'change', 'error']) {
      source.on(event, (...args) => {
        debug('passing through event', event)
        self.emit(event, ...args)
      } )
    }
    source.on('stable', () => { self._weAreStable })
    this._weAreStable()
  }

  forEach (f) {
    this._parent.forEach(f)
    for (let o of this._others) {
      o.forEach(f)
    }
  }

  count (f) {
    let n = this._parent.count()
    for (let o of this._others) {
      n += o.count()
    }
    return n
  }

}

module.exports = Multisource
