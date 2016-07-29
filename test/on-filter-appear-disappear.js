'use strict'

const test = require('./test')
const datapages = require('..')
const util = require('util')

for (let factory of test.dbFactories) {

  // skip for now
  if (factory.name === 'inmemWithA1Filter') continue
  if (factory.name === 'memlogbased') continue
  
  test(factory.name + ' filtered, updates -> appear, disappear', t => {
    t.plan(5)
    const output = test.logger(t)
    const db = factory()
    
    const alice = { name: 'Alice', age: 1 }

    db.create(alice)

    db.filter({ age: { $gte: 10, $lt: 20 }})
      .on('appear', page =>    { output(page.name, 'enters range 10<=x<20') })
      .on('disappear', page => { output(page.name, 'leaves range 10<=x<20') })
      .start()

    db.filter({ age: { $gte: 20, $lt: 30 }})
      .on('appear', page =>    { output(page.name, 'enters range 20<=x<30') })
      .on('disappear', page => { output(page.name, 'leaves range 20<=x<30') })
      .start()

    db.filter({ age: { $in: [10, 20, 30] }})
      .on('appear', page =>    { output(page.name, 'age becomes multiple of ten') })
      .on('disappear', page => { output(page.name, 'age stops being multiple of ten') })
      .start()

    db.update(alice, { age: 9 })
    output.was()
    db.update(alice, { age: 10 })
    output.was('Alice enters range 10<=x<20', 'Alice age becomes multiple of ten')
    db.update(alice, { age: 10.1 })
    output.was('Alice age stops being multiple of ten')
    db.update(alice, { age: 20 })
    output.was('Alice leaves range 10<=x<20', 'Alice enters range 20<=x<30', 'Alice age becomes multiple of ten')
    db.update(alice, { age: 21 })
    output.was('Alice age stops being multiple of ten' )
  })

}

