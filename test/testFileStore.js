'use strict'

const test = require('./test')
const FileStore = require('../FileStore')
const debug = require('debug')('testFS')
const fs = require('fs')

test('manual FileStore stuff', t => {
  //const dir = test.tmpdir()
  const dir = 'input/FileStore/1'

  {
    const n = 1
    const fs = new FileStore(dir, perItem, null, ready)
    //console.log('constructor returned')
    
    function perItem (...a) {
      // console.log(n, 'perItem', a)
    }
    function ready (...a) {
      // console.log(n, ready, a)
    }
  }

  

  t.end()
})

test('FileStore sync constructor', t => {
  const dir = test.tmpdir()
  const fstore = new FileStore(dir, () => {})
  t.assert(fstore.ready)
  t.equal(fstore._nextId, 0)
  t.end()
})

test('FileStore async constructor', t => {
  t.plan(4)
  const dir = test.tmpdir()
  const fstore = new FileStore(dir, () => {}, null, () => {
    t.assert(fstore.ready)
    t.equal(fstore._nextId, 0)
  })
  t.assert(!fstore.ready)
  t.equal(fstore._nextId, undefined)
})

test('FileStore add and delete', t => {
  t.plan(11)
  const dir = test.tmpdir()
  let k = 1000

  {
    const n = 1
    const fstore = new FileStore(dir, perItem)
    
    function perItem (...a) {
      t.fail()
    }

    const len = 21
    t.equal(fstore.save ({"Hello World":k++}), 0 * len)
    t.equal(fstore.save ({"Hello World":k++}), 1 * len)
    t.equal(fstore.save ({"Hello World":k++}), 2 * len)
    t.equal(fstore.save ({"Hello World":k++}), 3 * len)
  }

  {
    const fstore = new FileStore(dir, perItem, readingDone)

    let n = 0
    function perItem (...a) {
      switch (n++) {
      case 0: t.deepEqual(a, [ 0, { 'Hello World': 1000 } ]); break
      case 1: t.deepEqual(a, [ 21, { 'Hello World': 1001 } ]); break
      case 2: t.deepEqual(a, [ 42, { 'Hello World': 1002 } ]); break
      case 3: t.deepEqual(a, [ 63, { 'Hello World': 1003 } ]); break
      }
    }

    function readingDone () {
      
      fstore.removeById(21, () => {

        const fstore = new FileStore(dir, perItem)
        
        let n = 0
        function perItem (...a) {
          switch (n++) {
          case 0: t.deepEqual(a, [ 0, { 'Hello World': 1000 } ]); break
          case 1: t.deepEqual(a, [ 42, { 'Hello World': 1002 } ]); break
          case 2: t.deepEqual(a, [ 63, { 'Hello World': 1003 } ]); break
          }
        }
      })
    }

  }

})

test('FileStore big', t => {
  const dir = test.tmpdir('big')

  let lastId
  let k
  {
    const fstore = new FileStore(dir, perItem)
    
    function perItem (...a) {
      t.fail()
    }

    debug('queuing')
    // PERFORMANCE ISSUES
    //   -- I'd think we could go a lot higher than this, but no....
    for (k = 0; k < 500; k++) {
      fstore.save ({"Hello World":k})
    }
    lastId = fstore.save ({"Goodbye!":k}, stage2)
    debug('all queued')
    console.log('all queued')
  }

  function stage2 () {
    debug('on to stage 2!')
    console.log('started reading')
    const fstore = new FileStore(dir, perItem, doneReading)

    let lastReadId
    let lastReadItem
    function perItem (...a) {
      lastReadId = a[0]
      lastReadItem = a[1]
    }
    function doneReading () {
      console.log('done reading')
      t.deepEqual(lastReadItem, {"Goodbye!":k})
      t.equal(lastReadId, lastId)
      t.end()
    }
    
  }

})

test('FileStore big read', t => {
  const dir = test.tmpdir('big-read')

  console.log('writing it manually')
  const lines = []
  let k
  for (k = 0; k < 20000; k++) {
    lines.push(JSON.stringify({"Hello World":k}))
  }
  lines.push(JSON.stringify({"Goodbye!":k}))
  lines.push('')
  fs.writeFileSync(dir + '/data.jsonlines', lines.join('\n'))
  console.log('now reading')
  
  const fstore = new FileStore(dir, perItem, doneReading)

  let lastReadId
  let lastReadItem
  function perItem (...a) {
    lastReadId = a[0]
    lastReadItem = a[1]
  }
  function doneReading () {
    console.log('done reading')
    t.deepEqual(lastReadItem, {"Goodbye!":20000})
    t.equal(lastReadId, 428890)
    t.end()
  }
})
