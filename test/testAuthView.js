'use strict'

const test = require('./test')
const datapages = require('..')
const AuthView = require('../AuthView')

test('AuthView restrictions', t => {
  const data = new datapages.InMem()
  const output = test.logger(t)

  let wall = data.create({ name: 'Wall' })
  let email = data.create({ name: 'Email' })
  let password = data.create({ name: 'Password' })

  const may = {
    see: x => true,
    set: (obj, prop, value) => { return obj === wall }
  }
  
  const view = new AuthView(data, may)

  t.equal(view.count(), 3)
  may.see =  x => { return x !== password }
  t.equal(view.count(), 2)

  {
    let err = false
    try {
      view.create({ willFail: true })
    } catch (e) {
      err = true
    }
    t.assert(err)
  }
  may.create = x => true
  view.create({ willSucceed: true })
  
  
  /*
  data.on('results', all => {
    output('data:', all.map(x => x.name).join(', '))
  })
  output.was('data: Wall, Email, Password')

  view.on('results', all => {
    output('view:', all.map(x => x.name).join(', '))
  })
  output.was('view: Wall, Email, Password')
  */
  
  t.end()
})

