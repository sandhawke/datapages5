'use strict'

const Base = require('./Base')
const jsfilter = require('jsfilter').JsonFilter
const debug = require('debug')('Filter')

class Filter extends Base {
  constructor (parent, expr, options) {
    super()
    this._parent = parent
    this._passes = this._compile(expr)

    this._listenForListeners()
  }

  forEach (f) {
    this._parent.forEach(page => {
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

  /*
    If someone starts listening to us, then we need to listen to the
    parent and filter the events coming back.   Also, one some listens we 
  */
  _listenForListeners () {
    const self = this
    if (!self) throw Error('self is null?')
    let addedUpdateListener = false
    const parent = self._parent

    // Clunky, but I don't know a better way to set the right 'this'
    function appearListener (obj) {
      self._appearListener(obj)
    }
    function disappearListener (obj) {
      self._disappearListener(obj)
    }
    function updateListener (...a) {
      self._updateListener(...a)
    }
    function stableListener (obj) {
      self._stableListener(obj)
    }
    function resultsListener (...a) {
      self._resultsListener(...a)
    }

    this.replay = (event, listener) => {
      debug('replay', event)
      super.replay(event, listener)
      if (event === 'appear') {
        // super() will already have done
        // for us self.forEach(page => { listener(page) })
        self._listen(parent, 'appear', appearListener)
        if (!addedUpdateListener) {
          addedUpdateListener = true
          self._listen(parent, 'update-full', updateListener)
        }
      }
      if (event === 'disappear') {
        self._listen(parent, 'disappear', disappearListener)
        if (!addedUpdateListener) {
          addedUpdateListener = true
          self._listen(parent, 'update-full', updateListener)
        }
      }
      if (event === 'stable') {
        self._listen(parent, 'stable', stableListener)
      }
      if (event === 'results') {
        // super()'s newListener Listener will already have done self
        // for us...
        // listener(self.all())
        self._listen(parent, 'results', resultsListener)
      }
    }
  }
  
  _stableListener () {
    this.emit('stable')
  }

  _resultsListener () {
    this.emit('results', this.all())
  }

  _appearListener (obj) {
    if (this._passes(obj)) {
      this.emit('appear', obj)
      this.emit('change')
    }
  }

  _disappearListener (obj) {
    if (this._passes(obj)) {
      this.emit('disappear', obj)
      this.emit('change')
    }
  }

  _updateListener (before, after) {
    const wasIn = this._passes(before)
    const nowIn = this._passes(after)
    debug('updatesListener', this._expr, before, wasIn, after, nowIn)
    if (wasIn) {
      if (nowIn) {
        debug('still in, no change')
      } else {
        debug('disappear')
        this.emit('disappear', before)
        this.emit('change')
      }
    } else {
      if (nowIn) {
        debug('appear')
        this.emit('appear', after)
        this.emit('change')
      } else {
        debug('still not in, no change')
      }
    }
  }

}

module.exports = Filter
