'use strict'

/*
  create pages on demand
*/

const Base = require('./Base')

class VirtualView extends Base {
  constructor (parent) {
    super()
    this._parent = parent
    this._rules = []
  }

  /*
    Doesn't deeply parse the function code, but does look at it for
    the names of the arguments.  Later on, we'll deeply parse it, so
    we can compile it.  This is a bit like a prolog rule.  Bindings
    are results.
   */
  addPageRule (r) {
    this._rules.push(r)
  }

  /*
    It's not possible to implement this, because our rules need to
    know what they are trying to produce
  */
  forEach () {
    return this._errorNotImplemented()
  }

  filter (...args) {
    return new Filter(this, ...args)
  }
}

class Filter {
  constructor (db, expr, options) {
    this.db = db
    // parse expr
    // ignore options for now

    // find the rules that can produce something which matches
    // that expression
  }

  
}

module.exports = VirtualView

