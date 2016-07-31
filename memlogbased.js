'use strict'

const common = require('./common')
const debug = require('debug')('memlogbased')
const filteredlogview = require('./filteredlogview')

function memlogbased (options) {
  const db = new common.Base()
  const log = []
  const idprop = '__mlbindex'  // investigating using Symbol()

  // filteredlogview needs these
  db._idprop = idprop
  db._log = log

  // not doing the recursive thing for now.  that should be factored out
  function create (obj) {
    if (obj[idprop] === undefined) {
      obj[idprop] = log.length
      const trans = { tt: Date.now(),
                      created: Object.assign({}, obj),
                      // the creation transaction keeps a list of all
                      // later transactions on this id
                    }
      trans.history = [ trans ]  // the creation is history[0]
      log.push(trans)
      db.emit('appear', obj)
      db.emit('stable')
    }
  }

  function delete_ (obj) {
    if (obj[idprop] === undefined) throw Error('not one of mine')
    const trans = { tt: Date.now(), deleted: Object.assign({}, obj) } 
    log.push(trans)
    // make it easier to find when this was deleted
    log[obj[idprop]].history.push(trans)
    // do this before removing id
    db.emit('disappear', obj)
    // remove the id from this obj, so it can be used in another create
    delete obj[idprop]
    db.emit('stable')
  }

  function update (obj, overlay) {
    if (obj[idprop] === undefined) throw Error('not one of mine')
    const current = { }
    current[idprop] = obj[idprop]
    const trans = { tt: Date.now(),
                    overlay: Object.assign(current, overlay) }
    log.push(trans)
    log[obj[idprop]].history.push(trans)

    debug('HISTORY NOW', log[obj[idprop]].history)
    
    // some challenging emit's we're supposed to make...
    sendChange()
    db.emit('stable')
    
  }
  
  function count () {
    let n = 0
    debug('counting', log)
    for (let i = log.length - 1; i >= 0; i--) {
      const trans = log[i]
      if (trans.created) n++
      if (trans.deleted) n--
    }
    return n
  }

  function sendResults () {
    if (db.listeners('results', true)) {
      debug('stable, sending results')
      const objects = new Set()
      for (let trans of log) {
        if (trans.created) {
          objects.add(trans.created[idprop])
          debug('added to results', trans.created, ' => ', objects)
        }
        if (trans.deleted) {
          if (objects.delete(trans.deleted[idprop])) {
            debug('removed from results', trans.deleted, ' => ', objects)
          } else {
            debug('CANT remove from results', trans.deleted, ' => ', objects)
          }
        }
        // HANDLE UPDATES
      }
      const results = []
      for (let i of objects.values()) {
        // pushing just what was created, for now, ignoring updates
        results.push(log[i].created)
      }
      debug('results to send', results)
      db.emit('results', results)
    }
  }
  function sendChange () {
    db.emit('change')
  }
  
  function start () {
    db.on('appear', sendChange)
    db.on('disappear', sendChange)
    db.on('stable', sendResults)
    if (db.listeners('appear', true)) {
      // we do this by brute force, sending every appear + disappear !
      // ( it's lazy, but semantically acceptable, and likely to be
      // much faster until there are a lot of deleted object. )
      for (let trans of log) {
        if (trans.created) db.emit('appear', trans.created)
        if (trans.deleted) db.emit('disappear', trans.deleted)
      }
    }
    db.emit('stable')
  }

  // this is tricky, might as well just borrow the filter's version
  function forEach (f) {
    const filter = filteredlogview(db)
    filter.forEach(f)
  }

  function filter (expr, options) {
    return filteredlogview(db, expr, options)
  }
  
  db.create = create
  db.update = update
  db.delete = delete_
  db.count = count
  db.start = start
  db.filter = filter
  db.forEach = forEach
  
  return db
}

module.exports = memlogbased
