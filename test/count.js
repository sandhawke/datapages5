'use strict'

const test = require('./test')
const datapages = require('..')

for (let factory of test.dbFactories) {

  test(factory.name + ': count', t => {
    const db = factory()
    
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

}
