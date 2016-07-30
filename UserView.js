'use strict'

const Base = require('./Base')
const debug = require('debug')('inmem')

class AuthView extends Base {
  constructor (parent, may) {
    super()
    this._parent = parent
    this._may = may
  }

  contains (obj) {
    if (!this._may.see(obj)) return false
    return this._parent.contains(obj)
  }

  create (obj) {
    if (!this._may.create) return 
    return parent.create(obj)
  }

  delete (obj) {
    if (!this._may.delete(obj)) return
    parent.delete(obj)
  }

  forEach (f) {
    this._pages.forEach(x => {
      if (this._may.see(x)) f(x)
    })
  }
}

module.exports = InMem
