'use strict'

const Base = require('./Base')
const jsfilter = require('jsfilter').JsonFilter 
const debug = require('debug')('Filter')

class Filter extends Base {
  constructor (parent, expr, options) {
    super()
    this._parent = parent
    this._passes = this._compile(expr)
  }
  
  forEach (f) {
    this._parent.forEach( page => {
      if (this._passes(page)) f(page)
    })
  }

  contains (page) {
    return this._passes(page) && this._parent.contains(page)
  }

  create (obj) {
    this._useFixedValues(obj)
    if (this._passes(obj)) {
      this._parent.create(obj)
    } else {
      throw Error('db.create on a filter with non-passing value')
    }
  }

  delete (obj) {
    return this._parent.delete(obj)
  }

  update (obj, overlay) {
    // if this makes the obj no longer pass, then fine, it'll
    // just disappear.  We don't need to do anything here to make that
    // happen.  (because of our watching for updates)
    this._parent.update(obj, overlay)
  }
  
  /*
    Turn a filter expression into an executable function

    For now we use jsfilter, but I expect we'll want to roll our own
    at some point.
  */
  _compile (expr) {
    if (Reflect.ownKeys(expr).length === 0) return x => true
    this._rememberFixedValues(expr)
    const jsfObj = jsfilter.create(expr)
    return x => jsfObj.match(x)
  }

  /* 
     set up for _useFixedValues below
  */
  _rememberFixedValues (expr) {
    this._fixedValues = {}
    for (let p of Object.getOwnPropertyNames(expr)) {
      let t = typeof expr[p]
      if (t === 'string' || t === 'number' || t === 'boolean') {
        this._fixedValues[p] = expr[p]
      }
      // in fact, we'd like to do objects and arrays too, but ...
      // that's hard.  Wait until we have our own expr parser, I think.
    }
  }
  
  /*
    If this filter was defined with any properties constrainted to
    some fixed value, then set those values on this object now
  */
  _useFixedValues (obj) {
    for (let p of Reflect.ownKeys(this._fixedValues)) {
      if (Object.hasOwnProperty(obj, p)) {
        if (obj[p] === this._fixedValues[p]) {
          // great, already meets requirement
        } else {
          throw Error('db.create on a filter with non-passing value')
        }
      } else {
        // we'll add it for you!
        debug('setting fixed value', p, this._fixedValues[p])
        obj[p] = this._fixedValues[p]
      }
    }
    
  }

}

module.exports = Filter

