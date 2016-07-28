'use strict'

const test = require('tape')
const datapages = require('..')

let buf = ''
function log (...args) {
  buf += args.join(' ')
}
function logged () {
  const result = buf
  buf = 0
  return result
}

test('example in README', t => {

  const db = datapages.inmem()

  db.on('appear', page => {
    // actually doing the object wont JSON.stringify in deterministic order
    log('new page with name', page.name)
  })

  const alice = { name: 'Alice', age: 30 }
  const bob =   { bob:  'Bob', age: 29 }

  db.create(alice)
  t.equal(logged(), 'new page with name Alice')
  db.create(bob)
  t.equal(logged(), 'new page with name Bob')
  db.filter({ age: { $lt: 30 }})
    .on('appear', page => {
      log(name, 'is under 30')
      t.equal(logged(), 'Bob is under 30')
    })
  db.update(alice, { age: 27 })
  t.equal(logged(), 'Alice is under 30')
  db.filter({ age: { '>': 28 }})
    .on('results', results => {
      log('People under 28:',
                  results.map(x => x.name).join(', '))
    })
  t.equal(logged(), 'People under 28: Alice')
  db.update(alice, { age: 30})
  t.equal(logged(), 'People under 28:')
  db.update(bob, { age: 25})
  t.equal(logged(), 'Bob is under 30\nPeople under 28: Bob')
  db.update(alice, { age: 25})
  t.equal(logged(), 'Alice is under 30\nPeople under 28: Bob, Alice')
})
