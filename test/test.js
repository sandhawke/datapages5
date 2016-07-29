'use strict'

/*

  Shared stuff.

  Require this instead of 'tape' to get the shared stuff

  const test = require('./test')

*/

const test = require('tape')
const util = require('util')
const datapages = require('..')

test.dbFactories = [ datapages.inmem,
                     function inmemWithA1Filter () {
                       return datapages.inmem().filter({a:1})
                     }
                     
                   ]

test.logger = function (t) {
  const events = []

  const me = function (...args) {
    events.push(util.format(...args))
  }
  
  me.raw = function (...args) {
    events.push(...args)
  }
  
  me.was = function (...args) {
    t.deepEqual(events, args)
    events.splice(0)
  }

  return me
}

module.exports = test
