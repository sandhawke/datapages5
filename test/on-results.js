'use strict'

const test = require('./test')


test.eachClass('on-results', t => {
  const db = new t.Class()
  
  t.plan(10)
  const output = t.log
  

  const alice = { name: 'Alice' }
  const bob = { name: 'Bob' }

  db.create(alice)
  db.create(alice)

  db.onWithReplay('results', all => {
    output('db has:', all.map(x => x.name).join(', '))
  })

  output.was('db has: Alice')
  db.create(alice)
  output.was()
  db.delete(alice)
  output.was('db has: ') 
  db.create(alice)
  output.was('db has: Alice')
  db.create(bob)
  output.was('db has: Alice, Bob')
  db.create(alice)
  output.was()
  db.delete(bob)
  output.was('db has: Alice')
  try {
    db.delete(bob)
  } catch (err) {
    output('delete failed')
  }
  output.was('delete failed')
  db.delete(alice)
  output.was('db has: ')
  t.equal(db.count(), 0)
  
})

