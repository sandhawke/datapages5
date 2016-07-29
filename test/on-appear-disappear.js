'use strict'

const test = require('./test')
const datapages = require('..')
const util = require('util')

for (let factory of test.dbFactories) {

  test(factory.name + ' creates/delete -> appear/disappear', t => {
    t.plan(10)
    const output = test.logger(t)
    const db = factory()

    const alice = { name: 'Alice' }
    const bob = { name: 'Bob' }

    db.create(alice)
    db.create(alice)

    db.on('appear', page =>    { output(page.name, 'appears') })
      .on('disappear', page => { output(page.name, 'disappears') })
      .start()

    output.was('Alice appears')
    db.create(alice)
    output.was()
    db.delete(alice)
    output.was('Alice disappears')
    db.create(alice)
    output.was('Alice appears')
    db.create(bob)
    output.was('Bob appears')
    db.create(alice)
    output.was()
    db.delete(bob)
    output.was('Bob disappears')
    try {
      db.delete(bob)
    } catch (err) {
      output('delete failed')
    }
    output.was('delete failed')
    db.delete(alice)
    output.was('Alice disappears')
    t.equal(db.count(), 0)
    
  })

}
