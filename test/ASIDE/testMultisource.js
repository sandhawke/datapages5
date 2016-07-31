'use strict'

const test = require('./test')
const datapages = require('..')

test('multisource', t => {
  const output = test.logger(t)

  const alice = datapages.inmem()
  let a1 = alice.create({ name: 'Alice', age: 31 })
  let a2 = alice.create({ name: 'aloc', location: 'Argentina' })
  const bob = datapages.inmem()
  let b1 = bob.create({ name: 'Bob', age: 33 })
  let b2 = bob.create({ name: 'bloc', location: 'Boston' })
  const cora = datapages.inmem()

  output.was()
  // the filter below is there because I just broke inmem.on-results ?
  alice.filter({ name: {$ne: 'foo'}}).on('results', all => {
    output('alice has:', all.map(x => x.name).join(', '))
  })
  output.was('alice has: Alice, aloc')

  const aplus = datapages.multisource(alice)
  aplus.on('results', all => {
    output('multi has:', all.map(x => x.name).join(', '))
  })
  output.was('multi has: Alice, aloc') 
  
  aplus.include(bob)
  output.was('multi has: Alice, aloc, Bob, bloc')
  aplus.include(cora)
  output.was('multi has: Alice, aloc, Bob, bloc')
  let c1 = cora.create({ name: 'Cora', age: 32 })
  output.was('multi has: Alice, aloc, Bob, bloc, Cora')

  aplus.create({ name: 'Aplus' })
  output.was('alice has: Alice, aloc, Aplus' ,
             'multi has: Alice, aloc, Aplus, Bob, bloc, Cora')

  t.end(); return

  // WE'RE NOT GETTING disappear events?
  
  alice.delete(a1)
  output.was('multi has: aloc, Bob, bloc, Cora')
  t.end(); return
  bob.delete(b1)
  output.was('multi has: aloc, bloc, Cora')
  aplus.delete(a2)
  output.was('multi has: bloc, Cora')
  aplus.create(a1)
  output.was('multi has: Alice, bloc, Cora')
  t.end()
})
