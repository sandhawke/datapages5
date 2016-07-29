'use strict'

const common = require('./common')
const debug = require('debug')('memlogbased')

function memlogbased (options) {
  const db = new common.Base()
  const log = []
  const idprop = '__mlbindex'  // investigating using Symbol()

  function create (obj) {
    if (obj[idprop] === undefined) {
      obj[idprop] = log.length
      const trans = { tt: Date.now(), created: Object.assign({}, obj) }
      log.push(trans)
      db.emit('appear', obj)
      db.emit('stable')
    }
  }

  function delete_ (obj) {
    if (obj[idprop] === undefined) throw Error('not one of mine')
    const trans = { tt: Date.now(), deleted: Object.assign({}, obj) } 
    log.push(trans)
    delete obj[idprop]
    db.emit('disappear', obj)
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
  function sendChanged () {
    db.emit('changed')
  }
  
  function start () {
    db.on('appear', sendChanged)
    db.on('disappear', sendChanged)
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
  
  //function forEach () {
  // function filterTT (begins, before) {

  
  db.create = create
  db.delete = delete_
  db.count = count
  db.start = start
  
  return db
}

module.exports = memlogbased
