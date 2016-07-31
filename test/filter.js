'use strict'

const test = require('./test')
const datapages = require('..')

test.eachClass('filter', t => {
  const db = new t.Class()
  
  const alice = { name: 'Alice', x: 1}
  const bob =   { name: 'Bob',   x: 2}
  const cora =  { name: 'Cora',  x: 3}

  //db.createAll(alice, bob, cora)
  db.create(alice)
  db.create(bob)
  db.create(cora)

  let f

  f = db.filter({ x: 1 })
  t.deepEqual(f.all(), [alice])

  f = db.filter({ })
  t.deepEqual(f.all(), [alice, bob, cora])

  f = db.filter({ x: 0 })
  t.deepEqual(f.all(), [])

  f = db.filter({ x: { $gt: 1 } })
  t.deepEqual(f.all(), [bob, cora])

  t.end()
})

test.eachClass('big-filter', t => {
  const db = new t.Class()

  const alice = { name: 'Alice', x: 1}
  const bob =   { name: 'Bob',   x: 2}
  const cora =  { name: 'Cora',  x: 3}

  for (let i = 0; i < 1000; i++) {
    if (db.count() !== i) t.fail()   // don't make lots of tests
    const noise = { seq: i }
    db.create(noise)
  }

  //db.createAll(alice, bob, cora)
  db.create(alice)
  db.create(bob)
  db.create(cora)

  // if we're doing a linear search, this is going to be way slower,
  // passing the 10k records above for each match.
  
  for (let i = 0; i < 3; i++) {
    let f = db.filter({ x: { $gt: 1 } })
    t.deepEqual(f.all(), [bob, cora])
  }
  
  t.end()
})
