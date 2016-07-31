'use strict'

const common = require('./common')
const filteredview = require('./filteredview')
const debug = require('debug')('inmem')

// about time to switch over to class Inmem

function inmem () {
  const db = new common.Base()
  const pages = new Set()

  function contains (obj) {
    return pages.has(obj)
  }
  
  function create (obj) {
    if (pages.has(obj)) return
    pages.add(obj)
    if (!db._dontEmitAppear) {
      db.emit('appear', obj)
      db.emit('change')
      db._weAreStable()
    }
    return obj
  }

  function update (obj, overlay) {
    if (!pages.has(obj)) return db.error('db.update on not-created object')
    db.emit('update-before', obj, overlay)
    let before = null
    debug('do we have full-update listeners?')
    if (db.listeners('update-full', true)) {
      debug('yes')
      before = Object.assign({}, obj)
    }
    let changed = false
    for (let p of Object.getOwnPropertyNames(overlay)) {
      let value = overlay[p]
      let old = obj[p]
      // This wont notice an array whose elements have changed, but doing
      // that would be changing obj yourself, which is strictly forbidden
      if (old !== value) { 
        changed = true
        db.emit('update-property', p, old, value, obj)
        if (value === null) {
          delete obj[p]
        } else {
          db.createAll(value)
          obj[p] = value
        }
      }
    }
    if (changed) {
      if (before) db.emit('update-full', before, obj)
      db.emit('update-after', obj, overlay)
      db.emit('change')
      db._weAreStable()
    }
  }

  function delete_ (obj) {
    if (!pages.delete(obj)) return db.error('failure in db.delete')
    db.emit('disappear', obj)
    db.emit('change')
    db._weAreStable()
  }

  function count () {
    return pages.size
  }

  function forEach (f) {
    pages.forEach(f)
  }

  function filter (expr, options) {
    return filteredview(db, expr, options)
  }
  
  db.create = create
  db.update = update
  db.delete = delete_
  db.count = count
  db.forEach = forEach
  db.filter = filter
  return db
  
}

module.exports = inmem
