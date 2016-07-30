'use strict'

const Base = require('./Base')
const filteredview = require('./filteredview')
const debug = require('debug')('inmem')

class InMem extends Base {
  constructor () {
    super()
    this._pages = new Set()
  }

  contains (obj) {
    return this._pages.has(obj)
  }

  create (obj) {
    if (this._pages.has(obj)) return
    this._pages.add(obj)
    if (!this._dontEmitAppear) {
      this.emit('appear', obj)
      this.emit('change')
      this._weAreStable()
    } else {
      debug('supressed emit at request of caller')
    }
    return obj
  }

  delete (obj) {
    debug('XXXXXXXXXXXXXXX')
    if (!this._pages.delete(obj)) return this.error_notmine()
    this.emit('disappear', obj)
    this.emit('change')
    debug('delete, calling weAreStable')
    this._weAreStable()
    debug('delete, called weAreStable')
  }

  count () {
    return this._pages.size
  }

  forEach (f) {
    this._pages.forEach(f)
  }

  /*
  filter (expr, options) {
    return filteredview(this, expr, options)
  }
  */
  
}

module.exports = InMem
