'use strict'

/*
  TO DO:

  - filtering of history

  - returning of history

  - figure out how to abstract the log so it can be across the network

  - make a disk version

  - support for media changes as well

*/

const Base = require('./Base')
const Filter = require('./Filter')
const debug = require('debug')('memlogbased')

const idprop = '__mlbindex' // investigating using Symbol()

class MemLogBased extends Base {
  constructor () {
    super()
    this._log = []
    this._numAlive = 0
  }

  create (obj) {
    if (obj[idprop] === undefined) {
      obj[idprop] = this._log.length
      const trans = { tt: Date.now(),
        created: Object.assign({}, obj)
      }
      // the creation transaction keeps a list of all
      // later transactions on this id
      trans.history = [ trans ] // the creation itself is history[0]
      this._log.push(trans)
      this._numAlive++
      this.emit('appear', obj)
      this._weAreStable()
    }
  }

  delete (obj) {
    if (obj[idprop] === undefined) return this.errorNotMine()
    const trans = { tt: Date.now(), deleted: Object.assign({}, obj) }
    this._log.push(trans)
    this._numAlive--
    // make it easier to find when this was deleted
    this._log[obj[idprop]].history.push(trans)
    this._log[obj[idprop]].laterDeleted = trans
    // do this BEFORE removing id
    this.emit('disappear', obj)
    // remove the id from this obj, so obj can be used in another create
    delete obj[idprop]
    this._weAreStable()
  }

  // DOESNT DO THE REQUIRED EMITS
  update (obj, overlay) {
    if (obj[idprop] === undefined) throw Error('not one of mine')
    const current = { }
    current[idprop] = obj[idprop]
    const trans = { tt: Date.now(),
    overlay: Object.assign(current, overlay) }
    this._log.push(trans)
    this._log[obj[idprop]].history.push(trans)

    debug('HISTORY NOW', this._log[obj[idprop]].history)

    // some challenging emit's we're supposed to make...
    this.emit('change')
    this._weAreStable()
  }

      
  count () {
    return this._numAlive
  }

  slowCount () {
    let n = 0
    debug('counting', this._log)
    for (let i = this._log.length - 1; i >= 0; i--) {
      const trans = this._log[i]
      if (trans.created) n++
      if (trans.deleted) n--
    }
    return n
  }

  forEach (f) {
    // consider switching to
    //    const filter = filteredlogview(this, { })
    //    filter.forEach(f)
    for (let trans of this._log) {
      if (!trans.history) continue
      if (trans.laterDeleted) continue
      let state = null
      for (let t of trans.history) {
        if (t.created) {
          state = t.created
        } else if (t.deleted) {
          state = {}
        } else if (t.overlay) {
          // using Object.assign mean's we'll have nulls instead
          // of deleting, but I think that's fine.  People should
          // accept either null or undefined for missing properties.
          Object.assign(state, t.overlay)
        }
      }
      if (state) f(state)
    }
  }

  filter (expr, options) {
    return new MyFilter(this, expr, options)
  }
}

class MyFilter extends Filter {

  /*constructor (parent, expr, options) {
    super(parent, expr, options)
    this._historyPasses = options.historyFilter || x => true
  }
  
  forEach (f) {
    // TODO: APPLY this._historyPasses to every transaction we use
    this._parent.forEach(page => {
      if (this._passes(page)) f(page)
    })
  }
  
  // ... other funcs
*/
}


module.exports = MemLogBased
