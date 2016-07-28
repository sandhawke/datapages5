'use strict'
/**
 * Typically one creates a memstore and then relays behind it, rather
 * than re-implementing this interface.  Users can't tell the
 * difference as long as we have room to store all the pages in
 * memory.
 *
 * The callback parameter to create/update/delete is to be called back
 * if/when the data is "saved".  We don't do that, but hopefully some
 * watcher does, in which case it should invoke the callback (passing
 * it the page)
 */

const EventEmitter = require('eventemitter3')

/**
 * check if value is of the type we're allowed to store as the value
 * of a property.  We don't allow 'objects' (which should be their own
 * page) or things that can't be stored in JSON (like dates).
 *
 */
function isAllowedType (x) {
  if (x === undefined) {
    throw TypeError('calling isAllowedType on undefined')
  }
  const t = typeof x
  if (t === 'string') return true
  if (t === 'number') return true
  if (t === 'boolean') return true
  if (x.__blob) return true
  if (Array.isArray(x)) {
    for (let e of x) {
      if (!isAllowedType(x)) return false
    }
    return true
  }
  return false
}

function create () {
  const db = {}

  const items = new Set()

  const watchers = []
  // const nullcb = () => {}

  // If the value of a property is binary or big (more than a few kb),
  // best to wrap it in a blob.  This lets the underlying system
  // handle it much more efficiently, with streaming.  Blobs are
  // Writables (blog.write(...), blob.end()) and then immutable readable.
  db.blob = function (type, source) {
    // https://nodejs.org/api/buffer.html#buffer_buffers_and_typedarray
    const handle = { __blob: true, state: 'writable' }

    // set up writability...
    
    if (source && source.pipe) {
      source.pipe(handle)
    }
    handle.data = source
    handle.type = type
    return handle
  }
  
  db.create = function (source, cb) {
    const item = {}
    for (let p of Object.getOwnPropertyNames(source)) {
      let value = source[p]
      if (isAllowedType(value)) {
        item[p] = value
      } else if (items.has(value)) {
        // links to already-created items are fine
        // BUT we should watch for if/when they change!
        // ( TODO )
      } else {
        // at some point, we could recursively call create for nested
        // objects...
        //
        throw new Error('property values must be simple (in create), value=' + JSON.stringify(value))
      }
    }
    items.add(item)
    for (let w of watchers) {
      w(null, {created: [item], onsave: cb})
    }
    // cb(null, item)     makes no sense in this abstractions....
    // --- rather we want callbacks when its sync'd, modified, etc.
    //
    // cb could be after all the local synchronous callbacks are done
    // or ... other arbitrary stuff...?
    return item
  }

  db.update = function (item, overlay, cb) {
    // you mustn't just modify item -- you must let us do it, so we can
    // let others know...
    //
    // tempting to use ES2015 proxies, but at the moment those aren't
    // widely enough supported, eg by caja
    let changed = false
    for (let p of Object.getOwnPropertyNames(overlay)) {
      let value = overlay[p]
      let old = item[p]
      if (old !== value) {
        if (value === null || isAllowedType(value) || items.has(value)) {
          for (let w of item['__onUpdate_' + p] || []) {
            w(old, value)
          }
          changed = true
          if (value === null) {
            delete item[p]
          } else {
            item[p] = value
          }
        } else {
          throw new Error('property values must be simple (in update)')
        }
      }
    }
    if (changed) {
      for (let w of item['__onUpdated'] || []) {
        w(item, overlay)
      }
      for (let w of watchers) {
        w(null, {'updated': [item], onsave: cb})
      }
    }
    
  }

  db.delete = function (item, cb) {
    // should we tell the __onUpdate* watchers...?
    item._deleted = true
    items.delete(item)
    for (let w of watchers) {
      w(null, {'deleted': [item], onsave: cb})
    }
  }

  db.watch = function (replay, cb) {
    if (replay) {
      cb(null, {'created': Array.from(items.values())})
    }
    watchers.push(cb)
  }

  db.unwatch = function (cb) {
    const index = watchers.indexOf(cb)
    if (index > -1) {
      watchers.splice(index, 1)
    }
  }

  db.matchOne = function (f) {
    for (let p of items.values()) {
      if (p._deleted) continue
      if (f(p)) return p
    }
    return null
  }

  db.matchAll = function (f) {
    const result = []
    for (let p of items.values()) {
      if (p._deleted) continue
      if (f(p)) result.push(p)
    }
    return result
  }
  
  db.query = function (spec) {
    const q = new EventEmitter({ newListener: false })
    const results = new Set()
    let accept

    if (typeof spec === 'function') {
      accept = spec
    } else {
      throw Error('right now query only supports filter functions')
    }
    
    const recheck = function (p) {
      if (results.has(p)) {
        if (accept(p) && !p._deleted) {
          // item is still in result, no change
        } else {
          results.delete(p)
          q.emit('Disappear', p)
        }
      } else {
        if (accept(p) && !p._deleted) {
          results.add(p)
          q.emit('Appear', p)
        } else {
          // item is still out of result, no change
        }
      }
    }

    const watcher = function (err, event) {
      if (err) throw new Error(err)
      for (let p of event.created || event.updated || event.deleted) {
        recheck(p)
      }
    }

    // idea: use nextTick instead of this, since I tend to forget to
    // call start().   Maybe both; start a second time; make that okay.
    q.start = function () {
      for (let p of items.values()) {
        if (accept(p) && !p._deleted) {
          results.add(p)
          q.emit('Appear', p)
        }
      }
      db.watch(false, watcher)
    }

    q.stop = function () {
      db.unwatch(watcher)
    }


    return q
  }
  
  return db
}

module.exports.create = create
