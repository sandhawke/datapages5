'use strict'

const debug = require('debug')('filestore')
const debugGivid = require('debug')('filestore.givid')
const debugFlush = require('debug')('filestore.flush')
const fs = require('fs')
const file = require('file')
const memstore = require('./memstore')

// this is only for the convenience of admin looking at the database
// on disk in raw form
const types = {
  'text/plain': 'txt',
  'application/json': 'json',
  'image/jpeg': 'jpeg'
}

/**
   return string with any questionable characters turned to '_'
   
   slash is okay, though -- it's how we allow website organization
   
*/
const badChar = new RegExp('[^0-9a-zA-Z/-]', 'g')
function clean (s) {
  return s.replace(badChar, '_')
}


/*
function err (cb, msg) {
  // might log stuff too.   Do we want internal vs api errs?
  cb(msg)
  return undefined
}
*/

// not really happy with this, but I need some way to keep out the __
// properties.
function stringify (x) {
  const parts = []
  let keys = Object.getOwnPropertyNames(x)
  keys.sort()
  for (let k of keys) {
    if (k.startsWith('__')) continue
    parts.push(JSON.stringify(k) + ':' + JSON.stringify(x[k]))
  }
  return '{' + parts.join(',') + '}'
}

// don't try to use the database until cb is called; maybe we should
// use sync operations, or error-out calls?
function create (root, webPrefix) {
  const db = memstore.create()

  debug('filestore created, root=', root)
  file.mkdirsSync(root)
  file.walkSync(root, (dirPath, dirs, files) => {
    debug('files', dirPath, files)
    for (let f of files) {
      if (f.endsWith('.json')) {
        if (f.indexOf('__media') >= 0) continue
        let m = {}
        try {
          m = require(dirPath + '/' + f) // / WE COMPLETELY TRUST THESE FILES
        } catch (e) {
          console.error('BAD JSON FILE: ', dirPath + '/' + f)
        }
        debug('creating from', f)

        // hack -- this isn't right...
        m.__url = webPrefix + m.id
        if (m.mediaType) {
          m.__mediaURL = m.__url + '__media'
        }
        
        db.create(m)
      }
    }
  })

  // for reasonable id assignement performance, maintain an index by
  // id.  Presumably at some point memstore will do this for us...

  const byId = new Map()
  const slugCounter = new Map()
  db.watch(true, (err, event) => {
    if (err) throw Error('watch err')
    for (let p of event.created || event.updated || event.deleted) {
      // does NOT allow re-use of ids, but that's okay
      giveId(p)
    }
  })

  /**
     Make sure p.id is set
  */
  function giveId (p) {
    const debug = debugGivid
    // debug('called on %j', p)
    if (p.id) {
      // debug('returning, already set')
      byId.set(p.id, p)
      return
    }
    // debug('needs id')
    const slug = clean(p.slug || p.requestedId || 'a/')
    // debug('slug = ', slug)
    let count = slugCounter.get(p.slug)
    while (true) {
      if (count) {
        count++
      } else {
        count = 1
      }
      if (count === 1 && !slug.endsWith('/')) {
        p.id = slug
      } else {
        p.id = slug + count
      }
      if (!byId.has(p.id)) {
        slugCounter.set(p.slug, count)
        byId.set(p.id, p)
        // debug('assigned', p.id)
        return
      }
      // debug(p.id, 'had a conflict')
    // otherwise, let the counter climb...
    }
  }

  function filename (item, mediaType) {
    if (!item.id) {
      giveId(item)
    }
    item.__url = webPrefix + item.id
    if (mediaType) {
      item.__mediaURL = item.__url + '__media'
      let suffix = types[mediaType]
      if (!suffix) {
        suffix = mediaType.replace(/[^0-9a-zA-Z.]/i, '_')
      // bug: if someone changes the media type, well wont
      // see the data any more.   delete should delete ALL
      // __media.* files, but we could gather garbage before
      // that.
      }
      return root + '/' + item.id + '__media.' + suffix
    } else {
      return root + '/' + item.id + '.json'
    }
  }

  // function mark (item) {
  // we'd like people to be able to watch for an item being flushed
  // (or widely replicated) but if we make those attributes of the
  // object, whenever they're changed, it'll have to be flushed again!

  // we could have the flushed properties be no PageSubject
  // properties and not Page properties but InMemoryCopy properties,
  // so they DON'T get saved...
  // }

  db.watch(false, function (err, event) {
    debug('watch got', event)
    if (err) throw Error('watch')
    const cb = event.onsave
    if (event.created) {
      for (let i of event.created) {
        flush(i, cb)
      }
    }
    if (event.updated) {
      for (let i of event.updated) {
        debug('watch needs to flush', i.id)
        flush(i, cb)
      }
    }
    if (event.deleted) {
      for (let i of event.deleted) {
        // really we just keep it, with the __deleted flag, for now
        flush(i, cb)
      }
    }
  })

  db.read = function (id, cb) {
    // find by _globalId, of which we maintain an index.
    throw Error('NotImplemented')
  // cb(item)
  }

  const afterFlushDoAnother = new Map()

  function flush (item, cb) {
    const debug = debugFlush
    // we might be called many times for the same file before it returns.
    //
    // not sure what the OS might do about that, so let's not try to
    // write a second time until after the first returns.  The manual
    // says: Note that it is unsafe to use fs.writeFile multiple times
    // on the same file without waiting for the callback. For this
    // scenario, fs.createWriteStream is strongly recommended.

    debug('flush starting, item', item.id)
    
    if (item.inmemoryonly) return

    debug('flush non just inmem, item', item.id)
    
    if (afterFlushDoAnother.has(item)) {
      debug('flush on this item is IN PROGRESS, queing up another')
      afterFlushDoAnother.set(item, true)
      return
    }

    debug('flush not in progress, item', item.id)

    // signal that we've started a flush, and as of yet don't need another
    afterFlushDoAnother.set(item, false)

    const fn = filename(item)
    const dir = fn.slice(0, fn.lastIndexOf('/'))
    debug('flush to dir', dir)
    file.mkdirsSync(dir)  // Sync here is BAD, for checking...
    debug('made dirs, will be writing filename', fn)
    fs.writeFile(fn, stringify(item), (err) => {
      debug('wrote file', fn)
      if (err) {
        console.err(err)
      }
      debug('called callback')
      if (cb) cb(item)
      debug('checking if another was queue')
      if (afterFlushDoAnother.get(item)) {
        debug('Finished flush, but another was queued up so do it again')
        // start afresh...
        afterFlushDoAnother.delete(item)
        // (nextTick to avoid unlimited recursion)
        process.nextTick(() => {
          flush(item)
        })
      } else {
        // remove ourselves.   This is a confusing lock mechanism.
        afterFlushDoAnother.delete(item)
        debug('it was not')
      }
    })
  }

  db.mediaReader = (pg, options) => {
    // we should do more option checking and error checking, but this
    // gives us the basic idea for now
    if (!pg.mediaType || pg.mediaWriteInProgress) {
      return null
    }
    return fs.createReadStream(filename(pg, pg.mediaType), options)
  }

  db.mediaWriter = (pg, mediaType, optionsIn) => {
    const options = Object.assign(optionsIn || {})
    options.flags = 'w'
    if (pg.mediaWriteInProgress) {
      return null // in theory, we could return a passthrough stream
    // which is paused until writing is allowed....
    } else {
      db.update(pg, {mediaWriteInProgress: true})
    }
    const s = fs.createWriteStream(filename(pg, mediaType), options)
    s.on('close', () => {
      db.update(pg, {
        mediaType: mediaType,
        mediaBytes: s.bytesWritten,
        mediaWriteInProgress: null
      })
    })
    return s
  }

  return db
}

module.exports.create = create
