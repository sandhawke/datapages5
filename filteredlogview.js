'use strict'
/*

  This is where not really using classes starts to bite.  Probably
  time to switch.

  (there's a ton of copy-paste code from filteredview)


  call db this._parent

*/

const common = require('./common')
const jsfilter = require('jsfilter').JsonFilter  // rewrite this?
const debug = require('debug')('filtlogview')


function filteredlogview (db, expr, options) {
  options = options || {}
  const metaFilter = options.transactionFilter
  const log = db._log
  const idprop = db._idprop
  const v = new common.Base()
  let started = false
  let filterFunc
  const fixedValues = {}
  if (!expr) {
    // jsfilter doesn't have a null (always true) thing, I think
    expr = { no_such_property: { $ne: 'no such value' } }
  }
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

  let oldLogLength = 0

  function changeListener () {
    while (log.length > oldLogLength) {
      newTrans(log[oldLogLength++])
    }
  }

  function newTrans (trans) {
    if (!metaFilter || metaFilter(trans)) {
      if (trans.created) {
        appearListener(trans.created)
      } else if (trans.deleted) {
        disappearListener(trans.deleted)
      } else if (trans.overlay) {
        overlayListener(trans.overlay[idprop], trans.overlay)
      }
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
  function overlayListener (id, overlay) {
    // for now, be brute-force and just figure out before & after and
    // send them to pre-existing updatesListener
    let before = {}
    // stop one short, so we're not including this overlay
    const history = log[id].history
    for (let i = 0; i < history.length - 1; i++) {
      const t = history[i]
      if (!metaFilter || metaFilter(t)) {
        if (t.created) before = t.created
        else if (t.deleted) before = {}
        else if (t.overlay) Object.assign(before, t.overlay)
      }
    }
    const after = {}
    Object.assign(after, before, overlay)
    updatesListener(before, after)
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
    /*
      This code will overlap what update does to construct full-data [
      Later: Oh, actually I wrote update totally differently.
      Consider changing this one. ]

      I feel like there's a smarter way to do this going BACKWARD
      through the log, but let's try it the more obvious way first.

      
    */
    let states = [] // or use Map() ?   *shrug*
    
    for (let i = 0; i < log.length; i++) {
      const trans = log[i]
      if (metaFilter && !metaFilter(trans)) continue
      const id = trans[idprop]
      let state = states[id]
      // maybe keep sources inside it overlayed, since some callers want it?
      if (state === undefined) {
        state = { sources: [] }
        states[id] = state
      }
      if (trans.created) {
        // we might allow id re-use, so try to support that?
        state.sources.push(trans)
        state.overlayed = trans.created
      } else if (trans.deleted) {
        state.sources.push(trans)
        delete state.overlayed
      }
    }
    for (let i = 0; i < states.length; i++) {
      const value = states[i] && states[i].overlayed
      if (value && filterFunc(value)) f(value)
    }
  }

  // this should go in Base...
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
    // db.on('appear', appearListener)
    // db.on('disappear', disappearListener)
    db.on('full-update', updatesListener)
    db.on('change', changeListener)
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
  v.forEach = forEach
  v.filter = filter
  v.start = start
  v.stop = stop

  // passthru
  v.update = db.update   // it's okay to make it non-passing!
  v.delete = db.delete
  return v
}

module.exports = filteredlogview
