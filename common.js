'use strict'

/*
  Common functions we use in various other files
*/

const EventEmitter = require('eventemitter3')
const debug = require('debug')('common')

// recursivelyCreateIfNecessary

function createRecursively(item, create, alreadyCreated, error) {
  debug('createRecursively', item)
  const arrays = new Set()  // catching cycles among array
  const created = []

  function go (obj) { 
    const t = typeof obj
    if (t === 'string' || t === 'number' || t === 'boolean') return
    if (Array.isArray(obj)) {
      if (arrays.has(obj)) return
      for (let m of obj) {
        go(m)
      }
      return
    }
    if (t === 'object') {
      debug('maybe create obj', obj)
      if (alreadyCreated(obj)) return
      debug('yes')
      create(obj)
      created.push(obj)
      for (let p of Reflect.ownKeys(obj)) {
        debug('it has key', p)
        go(obj[p])
      }
      return
    }
    return error('unacceptable type in db.create')
  }
  
  go(item)
  return created
}

/*
  We pretty much just do Crockford classes, (ie not classes), but
  we'll use this for a few things.
*/
class Base extends EventEmitter {

  /* MAYBE we want a .has */
  
  count () {
    let n = 0
    this.forEach( () => ++n )
    return n
  }

  error (code) {
    if (this.listeners('error', true)) {
      this.emit('error', code)
      // control returns to caller!   so they should RETURN error(...)
    } else {
      throw Error(code)
    }
  }

}


module.exports.createRecursively = createRecursively
module.exports.Base = Base
