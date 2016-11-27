'use strict'

// NOT FULLY IMPLEMENTED.   PROOF OF CONCEPT
//
// see test/testAuthView

const Base = require('./Base')
const debug = require('debug')('AuthView')

class AuthView extends Base {
  constructor (parent, may) {
    super()
    if (!may) {
      may = {
        see: obj => true,
        create: obj => true,
        delete: obj => true,
        get: (obj, prop) => true,
        set: (obj, prop, val) => true
      }
    }
    this._parent = parent
    this.may = may
    let self = this
    
    function relay (event, obj) {
      // console.log('RELAYING', event)
      if (may.see(obj)) self.emit(event, obj)
    }
    parent.onWithReplay('appear', obj => { relay('appear', obj) })
    parent.on('disappear', obj => { relay('disappear', obj) })

    // should pass on results, with 'all' trimmed

    // should pass on update-* very carefully
    
  }

  contains (obj) {
    if (!this.may.see(obj)) return false
    return this._parent.contains(obj)
  }

  forEach (f) {
    this._parent.forEach(x => {
      if (this.may.see(x)) f(x)
    })
  }

  create (obj) {
    if (!this.may.create(obj)) return 
    return this._parent.create(obj)
  }

  delete (obj) {
    if (!this.may.delete(obj)) return
    this._parent.delete(obj)
  }
  
  _getProperty (obj, prop) {
    if (!this.may.get(obj, prop)) return
    return parent._getProperty (obj, prop)
  }

  _setProperty (obj, prop, value) {
    if (!this.may.set(obj, prop, value)) return
    return parent._getProperty (obj, prop)
  }

}

// values generator...

module.exports = AuthView
