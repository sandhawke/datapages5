'use strict'

// DOWN BELOW BECAUSE OF require LOOP
// I bet this will break browserify
// const Filter = require('./Filter')

const EventEmitter = require('eventemitter3')
const debug = require('debug')('Base')

class Base extends EventEmitter {

  constructor () {
    super() // without this, "this is not defined" !

    /*
    // alas, EventEmitter3 decided against newListeners support.  :-(
    this.on('newListener', (event, listener) => {
      debug('newListener', event)
      if (event === 'appear') {
        this.forEach(page => { listener(page) })
      }
      if (event === 'results') {
        listener(this.all())
      }
      if (event === 'stable') {
        // if someone asks if we're stable, ... yeah, sure, honey
        //
        // (By the time they could be asking that, I'm pretty sure we are.)
        listener()
      }
    })
    */
  }

  onceWithReplay (event, listener) {
    this.replay(event, listener)
    this.once(event, listener)
    return this
  }
  onWithReplay (event, listener) {
    this.replay(event, listener)
    this.on(event, listener)
    return this
  }
  replay (event, listener) {
    if (event === 'appear') {
      this.forEach(page => { listener(page) })
    }
    if (event === 'results') {
      listener(this.all())
    }
    if (event === 'stable') {
      // if someone asks if we're stable, ... yeah, sure, honey
      //
      // (By the time they could be asking that, I'm pretty sure we are.)
      listener()
    }
  }

  
  mirror (buddy) {
    this._listen(buddy, 'appear', this.create)
    this._listen(buddy, 'disappear', this.delete)
    this._listen(buddy, 'update-before', this.update)
  }

  // allows array of pages (and we wont be 'stable' until all are
  // done), and does all referenced pages, with cycles being okay
  createAll (...args) {
    debug('createAll', args)

    /*
    const t = typeof obj
    if (obj === null || t === 'string' ||
        t === 'number' || t === 'boolean') return
    */
    const visited = new Set() // catching cycles among arrays, too
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
      return this.error('unacceptable type in db.create')
    }

    // hack to tell this.create() not to issue 'appear' events,
    // because it would be doing them at the wrong time, and with too
    // many 'stable' points.
    this._dontEmitAppear = true

    go(args)
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
    return args
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
    this.forEach(() => ++n)
    return n
  }

  error (code) {
    this.emit('error', code)

    /*
    // maybe just emit, if we not going to use EventEmitter3
    if (this.listeners('error', true)) {
      this.emit('error', code)
    // control returns to caller!   so they should RETURN error(...)
    } else {
      throw Error(code)
    }
    */
  }

  _weAreStable () {
    this.emit('stable')
    // debug('_weAreStable, anyone want results?', this.listeners('results'), this)
    if (this.listeners('results').length > 0) {
      debug('YES')
      this.emit('results', this.all())
    }
  }

  // this is defined to return an array, not an interator like values()
  all () {
    const results = []
    this.forEach(x => { results.push(x) })
    debug('returning values()', results)
    return results
  }

  // use this to remember it, so we can stop it later.
  // not sure this is necessary
  _listen (obj, event, func) {
    this._toStop = this.toStop || []
    this._toStop.push([obj, event, func])
    obj.on(event, func)
  }

  stop () {
    for (let entry of this.toStop || []) {
      let [obj, event, func] = entry
      obj.off(event, func)
    }
  }

  filter (expr, options) {
    const Filter = require('./Filter')
    return new Filter(this, expr, options)
  }

  errorNotMine () {
    return this.error('operation invoked on object not in this db')
  }

  // We definee _getProperty and _setProperty so you can override them
  // to get update() to operator on your own page type, if you're not
  // just using js objects

  _getProperty (obj, prop) {
    return obj[prop]
  }

  _setProperty (obj, prop, value) {
    if (value === null) {
      delete obj[prop]
    } else {
      obj[prop] = value
    }
  }

  update (obj, overlay) {
    if (!this._pages.has(obj)) return this.error_notmine()
    this.emit('update-before', obj, overlay)
    let before = null
    debug('do we have full-update listeners?')
    if (this.listeners('update-full').length > 0) {
      debug('yes')
      before = Object.assign({}, obj)
    }
    let changed = false
    for (let p of Reflect.ownKeys(overlay)) {
      let value = overlay[p]
      let old = this.getProperty(obj, p)
      // This wont notice an array whose elements have changed, but doing
      // that would be changing obj yourself, which is strictly forbidden
      if (old !== value) {
        changed = true
        this.emit('update-property', p, old, value, obj)
        this.createAll(value)
        this._setProperty(obj, p, value)
      }
    }
    if (changed) {
      if (before) this.emit('update-full', before, obj)
      this.emit('update-after', obj, overlay)
      this.emit('change')
      this._weAreStable()
    }
  }

}

/*
// This is out here because JS6 class syntax doesn't seem to allow
// "function *"
//
// YOU REALLY SHOULD OVERRIDE THIS with your own iterator.  We
// can't even call forEach in an iterator, so this is brutal.  I
// don't want to just return the array because then people will
// write code which assumes it's an array.

Base.prototype.values = function * values () {
  for (let v of this.valueArray()) yield v
}
*/

module.exports = Base



