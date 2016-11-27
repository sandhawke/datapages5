'use strict'

/*

  Wraps a database, becoming a thing with a minimal delta interface,
  for easy communication with a db across a narrow channel, like a
  postMessage interface or a websocket.  or for saving changes.

  * You invoke  it to make database changes.
  * You tell it streamTo(x) and it'll send all databases changes to x
    (including reflecting your changes back)
 
  Both directions use the same simple, flat, easy-to-make-binary api,
  which just uses numbers, fixed strings, and blobs.  (maybe arrays?)


  dbstr = new Streamer(db)

  dbstr.push('new', 2000)
  dbstr.push('set', 2000, 'message', 'string', 'Hello, World')
  dbstr.push('drop', 2000)

  dbstr.streamTo(str2)

  db.create({a:1})
  // calls str2('new', -1024), ...
  


  Do we convey queries?   That's where things get interesting!
  dbstr('query', 2001)    (MIGHT be in the search pool -- that should be okay)
  dbstr('pattern', 2002)   <--- kept out of the search pool!
  dbstr('set', 2001, filter, 'ref', 2002)

  does q.limit(...)
  make a new query?   Or just update that one?
  I think it DOES make a new one



  Also, how do we avoid echoing back our own changes?  Or is that what
  we should do?  It depends what's happening in the cache, etc.  As
  long as we're good in the obj mapper, it should be okay!


*/

const debug = require('debug')('Streamer')

const incr = -1  // generates negative numbers, since we're a server

class Streamer {

  constructor (db) {
    this._db = db
    this._ids = new Map()
    this._objs = new Map()
    
  }

  objidFor (obj) {
    if (this._nextId === undefined) {
      this._nextId = 1024 * incr
    }
    let objid  = this._ids.get(obj)
    if (objid === undefined) {
      objid = this._nextId
      this._nextId += incr
      this._ids.set(obj, objid)
      this._objs.set(objid, obj)
    }
    return objid
  }

  streamTo (watcher) {
    this._watcher = watcher

    this._db.on('appear', obj => {
      debug('appear triggered')
      const objid = this.objidFor(obj)
      this._watcher.push(['new', objid])
      for (let prop of Reflect.ownKeys(obj)) {
        const propid = prop // for now!   needs vocabspec stuff here
        const type = 'raw' // for now!   needs other stuff before we go binary
        // if the type is OBJECT, then .... do stuff.
        this._watcher.push(['set', objid, propid, type, obj[prop]])
      }
    })

    this._db.on('update-property', (p, old, value, obj) => {
      debug('update property triggered')
      const objid = this.objidFor(obj)
      this._watcher.push(['set', objid, p, 'raw', value])
    })

    
    // disappear
    // updated?
  }

  push (...fullargs) {
    const [cmd, ...args] = fullargs
    if (cmd === 'new') {
      const objid = args[0]
      if (objid < 0) throw Error('only I get to assign negative objids')
      let obj = this._objs.get(objid)
      if (obj === undefined) {
        obj = {}
        this._ids.set(obj, objid)
        this._objs.set(objid, obj)
        this._db.create(obj)
      }
    } else if (cmd === 'set') {
      const [objid, propid, type, value] = args
      let obj = this._objs.get(objid)
      if (obj === undefined) throw Error('set of unknown objid ' + objid)
      const overlay = {}
      overlay[propid] = value
      this._db.update(obj, overlay)
    } else {
      throw Error('unknown cmd', cmd)
    }
  }
  
  
}


module.exports = Streamer
