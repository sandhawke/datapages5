'use strict'

const test = require('./test')

test.eachClass('on-xappear', t => {
  const db = new t.Class()
  const output = t.log
  t.plan(10)
  
  const alice = { name: 'Alice' }
  const bob = { name: 'Bob' }

  db.create(alice)
  db.create(alice)

  db.on('appear', page =>    { output(page.name, 'appears') })
    .on('disappear', page => { output(page.name, 'disappears') })

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
