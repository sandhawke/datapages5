'use strict'

const common = require('./common')
const filteredview = require('./filteredview')
const debug = require('debug')('inmem')

function inmem () {
  const db = new common.Base()
  const pages = new Set()
  
  // you can pass obj as an array of objects, in which case 'stable'
  // is only emited after they are all done.  Should that be supported
  // behavior?   Let's see how ondurable gets implemented first
  //
  // also, maybe recursivelyCreateIfNecessary should be a public Base method
  // so we don't need to do any of this.
  function create (obj, ondurable) {
    if (ondurable) throw Error('not implemented')
    const created = common.createRecursively(
      obj,
      item => { pages.add(item) },
      item => pages.has(item),
      db.error
    )
    if (created.length > 0) {
      // we save these for now, so that we don't emit 'appear' on
      // pages referring to pages that haven't been created yet
      for (let page of created) {
        db.emit('appear', page)
        db.emit('change')
      }
      db.emit('stable')
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
          obj[p] = value
          // BUG do      common.createRecursively(value)
        }
      }
    }
    if (changed) {
      if (before) db.emit('update-full', before, obj)
      db.emit('update-after', obj, overlay)
      db.emit('change')
      db.emit('stable')
    }
  }

  function delete_ (obj) {
    if (!pages.delete(obj)) return db.error('failure in db.delete')
    db.emit('disappear', obj)
    db.emit('change')
  }

  function count () {
    return pages.size
  }

  function filter (expr) {
    if (expr === null) return db
    return filteredview(db, expr)
  }

  function forEach (f) {
    pages.forEach(f)
  }

  function start () {
    if (db.listeners('appear', true)) {
      forEach(page => { db.emit('appear', page) })
      db.emit('change')
    }
  }

  function stop () {
  }
    
  db.create = create
  db.update = update
  db.delete = delete_
  db.filter = filter
  db.count = count
  db.forEach = forEach
  db.start = start
  db.stop = stop
  return db
}

module.exports = inmem
