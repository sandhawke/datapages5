'use strict'

/*
  Common functions we use in various other files
*/

const EventEmitter = require('events')
const debug = require('debug')('common')

class Base extends EventEmitter {

  constructor () {
    super()  // without this, "this. is not defined" !

    // alas, EventEmitter3 took out newListeners support.  :-(
    this.on('newListener', (event, listener) => {
      debug('newListener', event)
      if (event === 'appear') {
        this.forEach(page => { listener(page) })
      }
      if (event === 'results') {
        listener(this.values())
      }
    })
  }

  // allows array of pages (and we wont be 'stable' until all are
  // done), and does all referenced pages, with cycles being okay
  createAll (obj) {
    debug('createAll', obj)
    // let's skip creating a Set for simple values
    if (t === 'string' || t === 'number' || t === 'boolean') return
    const visited = new Set()  // catching cycles among arrays, too
    const created = []

    function go (obj) {
      const t = typeof obj
      if (t === 'string' || t === 'number' || t === 'boolean') return
      if (visited.has(obj)) return
      if (Array.isArray(obj)) {
        for (let m of obj) {
          go(m)
        }
        return
      }
      if (t === 'object') {
        debug('maybe create obj', obj)
        if (this.contains(obj)) return
        debug('yes')
        this.create(obj)
        created.push(obj)
        for (let p of Reflect.ownKeys(obj)) {
          debug('it has key', p)
          go(obj[p])
        }
        return
      }
      return error('unacceptable type in db.create')
    }

    // hack to tell this.create() not to issue 'appear' events,
    // because it would be doing them at the wrong time, and with too
    // many 'stable' points.
    this._dontEmitAppear = true
    
    go(item)
    delete this._dontEmitAppear

    if (created.length > 0) {
      // we save these for now, so that we don't emit 'appear' on
      // pages referring to pages that haven't been created yet
      for (let page of created) {
        this.emit('appear', page)
      }
      this.emit('change') 
      this._weAreStable()
    }
    return obj
  }

  
  // try to override this with something faster!  And if your equality
  // is different
  contains (page) {
    let result = false
    this.forEach(x => { if (x === page) result = true })
    return result
  }
  
  count () {
    let n = 0
    this.forEach( () => ++n )
    return n
  }

  error (code) {
    if (this.listeners('error', true)) {
      this.emit('error', code)
      // control returns to caller!   so they should RETURN error(...)
    } else {
      throw Error(code)
    }
  }

  _weAreStable () {
    this.emit('stable')
    if (this.listeners('results', true)) {
      this.emit('results', this.values())
    }
  }

  // guaranteed to be array-like, not just iterable, eg with .map()
  values () {
    const results = []
    this.forEach(x => { results.push(x) })
    debug('returning values()', results)
    return results
  }

  // use this to remember it, so we can stop it
  // not sure this is necessary
  _listen (obj, event, func) {
    this._toStop = this.toStop || []
    this._toStop.push([obj, event, func])
    obj.on(event, func)
  }
    
  stop () {
    for (let entry of this.toStop || []) {
      let [obj, event, func ] = entry
      obj.off(event, func)
    }
  }

  filter (expr, options) {
    throw Error('Not Implemented')
    return new Filter(this, expr, options)
  }
  
}

class Filter extends Base {

  constructor (parent, expr, options) {
    super()
  }

}

module.exports.Base = Base
