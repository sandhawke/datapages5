'use strict'

/*

  Shared stuff.

  Require this instead of 'tape' to get the shared stuff

  const test = require('./test')

*/

const test = require('tape')
const util = require('util')
const datapages = require('..')

class AuthViewOnInMem extends datapages.AuthView {
  constructor () {
    super(new datapages.InMem())
  }
}

class InMemFilterA1 {
  constructor () {
    const m = new datapages.InMem()
    m.create( { anotherItem: 'to be a challenge' } )
    const f = m.filter({ a: 1 })
    return f
  }
}

// Class, followed by array of tests to skip

const classEntries = [
  [ datapages.InMem, [] ],
  [ datapages.MemLogBased, [] ],
  [ InMemFilterA1, ['big-count', 'on-xappear', 'on-results' ]],
  [ AuthViewOnInMem, ['on-results', 'big-count'] ],
]

function * classes (testName) {
  for (let e of classEntries) {
    const Class = e[0]
    Class.testName = Class.testName || Class.name
    if ((e[1] || []).includes(testName)) {
      // not actually seen running under faucet
      console.log('skipping test:', testName, Class.testName)
    } else {
      yield Class
    }
  }
}

function eachClass (testName, cb) {
  for (let Class of test.classes(testName)) {
    // test.Class = Class // wacky way to sneak by extra parameter
    // test(testName + ' : ' + Class.testName, ...rest)
    test(testName + ' : ' + Class.testName, t => {
      t.Class = Class
      t.log = logger(t)
      cb(t)
    })
  }
}

test.eachClass = eachClass
test.classes = classes

/*
test.dbFactories = [ datapages.inmem,
                     function inmemWithA1Filter () {
                       return datapages.inmem().filter({a:1})
                     },
                     datapages.memlogbased
                   ]
*/

test.logger = logger
function logger (t) {
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
