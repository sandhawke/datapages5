'use strict'

const test = require('./test')
const datapages = require('..')

test.eachClass('count', t => {
  const db = new t.Class()
  
  const alice = { }
  const bob = { }

  t.equal(db.count(), 0)
  db.create(alice)
  t.equal(db.count(), 1)
  db.create(bob)
  t.equal(db.count(), 2)
  db.delete(alice)
  t.equal(db.count(), 1)
  db.create(alice)
  t.equal(db.count(), 2)
  db.delete(bob)
  t.equal(db.count(), 1)
  db.delete(alice)
  t.equal(db.count(), 0)
  t.end()
})

test.eachClass('big-count', t => {
  const db = new t.Class()

  // Always interesting what you catch like this.
  //
  // When I changed from EventEmitter3 to EventEmitter to get
  // addListener, I forgot to change listeners(event, true) to
  // listeners(event).length > 0, which meant we were preparing 'results'
  // parameters a lot more than we should have been.  Mad it slow.
  
  for (let i = 0; i < 10000; i++) {
    if (db.count() !== i) t.fail()   // don't make lots of tests
    const alice = { }
    db.create(alice)
  }
  t.pass()
  t.end()
})
