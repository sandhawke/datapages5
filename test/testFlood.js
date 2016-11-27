'use strict'

const test = require('./test')
const datapages = require('..')
const Streamer = require('../Streamer')
const Flood = require('../Flood')

test('basic Flood', t => {
  const output = test.logger(t)

  function makeWatcher (tag) {
    function watcher (arg) {
      output(tag, ...arg)
    }
    return watcher
  }

  const f = new Flood()
  
  const db1 = new datapages.InMem()
  new Streamer(db1).streamTo(makeWatcher('db1'))

  db1.create({a:10})
  output.was('db1 new -1024', 'db1 set -1024 a raw 10')
  
  const db2 = new datapages.InMem()
  new Streamer(db2).streamTo(makeWatcher('db2'))

  /*
  db2.create({b:20})
  output.was('db2 new -1024', 'db2 set -1024 b raw 20')
  */
  
  f.add(db1)
  output.was()

  f.add(db2)
  output.was('db2 new -1024', 'db2 set -1024 a raw 10' )

  const p = {} 
  db1.create(p)
  output.was('db1 new -1025', 'db2 new -1025')

  db1.update(p, {c:30})
  output.was('db1 set -1025 c raw 30', 'db2 set -1025 c raw 30')

  const db3 = new datapages.InMem()
  new Streamer(db3).streamTo(makeWatcher('db3'))
  f.add(db3)
  output.was('db3 new -1024',
             'db3 set -1024 a raw 10',
             'db3 new -1025',
             'db3 set -1025 c raw 30')

  db3.create({d:40})
  output.was('db3 new -1026',
             'db3 set -1026 d raw 40',
             'db2 new -1026',
             'db1 new -1026',
             'db2 set -1026 d raw 40',
             'db1 set -1026 d raw 40')

  db1.filter({d:40})
    .onWithReplay('appear', d => {
      // console.log('got page', d)
      db1.update(d, {d:39})
      output.was('db1 set -1026 d raw 39',
                 'db2 set -1026 d raw 39',
                 'db3 set -1026 d raw 39')
      
      t.end()
    })

})
