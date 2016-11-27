'use strict'

const test = require('./test')
const datapages = require('..')
const Streamer = require('../Streamer')

test('basic Streamer', t => {
  const db = new datapages.InMem()
  const output = test.logger(t)

  const s = new Streamer(db)
  const s2 = new Streamer(db)

  const watcher = {}
  watcher.push = (arg) => {
    output('saw', ...arg)
  }
  function dump (db) {
    output('db is')
    db.forEach(item => {
      output('-', item)
    })
  }
  
  s.streamTo(watcher)

  const log = []
  s2.streamTo(log)

  db.create({a:10})
  output.was('saw new -1024', 'saw set -1024 a raw 10')

  t.deepEqual(log, [
    [ 'new', -1024 ],
    [ 'set', -1024, 'a', 'raw', 10 ]
  ])
  
  dump(db)
  output.was('db is', '- { a: 10 }')

  s.push('set', -1024, 'a', 'raw', 20)
  dump(db)
  output.was('saw set -1024 a raw 20', 'db is', '- { a: 20 }')

  t.deepEqual(log, [
    [ 'new', -1024 ],
    [ 'set', -1024, 'a', 'raw', 10 ],
    [ 'set', -1024, 'a', 'raw', 20 ]
  ])

  s.push('new', 2000)
  dump(db)
  output.was('saw new 2000', 'db is', '- { a: 20 }', '- {}')

  t.deepEqual(log, [
    [ 'new', -1024 ],
    [ 'set', -1024, 'a', 'raw', 10 ],
    [ 'set', -1024, 'a', 'raw', 20 ],
    [ 'new', -1025 ]
  ])
  
  s.push('set', 2000, 'b', 'raw', 20)
  output.was('saw set 2000 b raw 20')

  dump(db)
  output.was('db is', '- { a: 20 }', '- { b: 20 }')


  t.deepEqual(log, [
    [ 'new', -1024 ],
    [ 'set', -1024, 'a', 'raw', 10 ],
    [ 'set', -1024, 'a', 'raw', 20 ],
    [ 'new', -1025 ],
    [ 'set', -1025, 'b', 'raw', 20 ]
  ])

  t.end()
})

