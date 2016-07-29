'use strict'
/*
  This view does NOT store any data
  
  One could absolutely have a view that did.  Or you could just wrap a
  cache around this one.
*/

const common = require('./common')
const jsfilter = require('jsfilter').JsonFilter  // rewrite this?
const debug = require('debug')('filtview')


function filteredview (db, expr) {
  const  v = new common.Base()
  let started = false
  let filterFunc = filter.func
  const fixedValues = {}
  if (!filterFunc) {
    const jsfObj = jsfilter.create(expr)
    filterFunc = x => jsfObj.match(x)
    for (let p of Object.getOwnPropertyNames(expr)) {
      let t = typeof expr[p]
      if (t === 'string' || t === 'number' || t === 'boolean') {
        fixedValues[p] = expr[p]
      }
      // in fact, we'd like to do objects and arrays too, but ...
      // that's hard.  Wait until we have our own expr parser, I think.
    }
  }
  debug('fixed values', fixedValues)

  function create(obj) {
    debug('create', obj)
    for (let p of Reflect.ownKeys(fixedValues)) {
      if (Object.hasOwnProperty(obj, p)) {
        if (obj[p] === fixedValues[p]) {
          // great, already meets requirement
        } else {
          throw Error('db.create on a filter with non-passing value')
        }
      } else {
        // we'll add it for you!
        debug('setting fixed value', p, fixedValues[p])
        obj[p] = fixedValues[p]
      }
    }
    if (filterFunc(obj)) {
      db.create(obj)
    } else {
      throw Error('db.create on a filter with non-passing value')
    }
  }

  function appearListener (obj) {
    if (filterFunc(obj)) {
      v.emit('appear', obj)
      v.emit('change')
    }
  }
  function disappearListener (obj) {
    if (filterFunc(obj)) {
      v.emit('disappear', obj)
      v.emit('change')
    }
  }
  // we really need before and after, even though this means copying
  function updatesListener (before, after) {
    const wasIn = filterFunc(before)
    const nowIn = filterFunc(after)
    debug('updatesListener', expr, before, wasIn, after, nowIn)
    if (wasIn) {
      if (nowIn) {
        debug('still in, no change')
      } else {
        debug('disappear')
        v.emit('disappear', before)
        v.emit('change')
      }
    } else {
      if (nowIn) {
        debug('appear')
        v.emit('appear', after)
        v.emit('change')
      } else {
        debug('still not in, no change')
      }
    }
  }

  function forEach (f) {
    db.forEach(x => { if (filterFunc(x)) f(x) }) 
  }

  function sendResults () {
    if (v.listeners('results', true)) {
      const results = []
      forEach(x => { results.push(x) })
      v.emit('results', results)
    }
  }

  function sendStable () {
    v.emit('stable')
  }
  
  function start () {
    if (started) return
    started = true
    db.on('appear', appearListener)
    db.on('disappear', disappearListener)
    db.on('full-update', updatesListener)
    db.on('stable', () => { v.emit('stable') })

    if (v.listeners('appear', true)) {
      forEach(x => { v.emit('appear', x) })
    }
    v.on('stable', sendResults)
    v.emit('stable')
    v.emit('changed')   // possibly not, but who cares?
    
  }

  function stop () {
    db.off('appear', appearListener)
    db.off('disappear', disappearListener)
    db.off('full-update', updatesListener)
    v.off('stable', sendResults)
  }

  function filter (expr) {
    if (expr === null) return v
    return filteredview(v, expr)
  }
  
  process.nextTick(start)  // this allows you to write filter().on(...)

  // overrides
  v.create = create
  v.forEach = forEach
  v.filter = filter
  v.start = start
  v.stop = stop

  // passthru
  v.update = db.update   // it's okay to make it non-passing!
  v.delete = db.delete
  return v
}

module.exports = filteredview
