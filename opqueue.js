'use strict'
/* 
   Operation Queue (or Function Call Queue)
   
   provides a queue of async functions to call in sequence.  Each one
   is run given an ondone function to call, when done, as its sole
   parameter.  I know, I know, this is where we're supposed to use
   promises.
*/

const debug = require('debug')('opqueue')

function opqueue (eachTimeEmpty) {
  const q = []
  let running = false

  function push (...funcs) {
    q.push(...funcs)
    debug('pushed', funcs)
    runIfNeeded()
  }

  function name (x) {
    return x.debugname || x.name || 'anon'
  }
  
  function runIfNeeded () {
    debug('runIfNeeded, q=', q.map(name))
    if (running) {
      debug('was already running, returning')
      return
    }
    let op = q.shift()
    if (op === undefined) {
      if (eachTimeEmpty) eachTimeEmpty()
      return
    }
    debug('runIfNeeded, running ', name(op))
    running = true
    op(() => {
      running = false
      
      // do it on the nextTick to avoid the stack growning without bound,
      // if the queue never drains
      process.nextTick(runIfNeeded)
    })
  }

  const me = {}
  me.push = push
  return me
}

module.exports = opqueue
