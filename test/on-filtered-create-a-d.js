'use strict'

const test = require('./test')
const datapages = require('..')
const util = require('util')

for (let factory of test.dbFactories) {

  // skip for now
  if (factory.name === 'inmemWithA1Filter') continue
  
  test(factory.name + ' filtered, create/delete -> appear, disappear', t => {
    t.plan(9)
    const output = test.logger(t)
    const db = factory()

    let alice
    /*
    const alice9 = { name: 'Alice', age: 9 }
    const alice10 = { name: 'Alice', age: 10 }
    const alice11 = { name: 'Alice', age: 11 }
    const alice19 = { name: 'Alice', age: 19 }
    const alice20 = { name: 'Alice', age: 20 }
    const alice22 = { name: 'Alice', age: 22 }
    */

    db.create(alice = { name: 'Alice', age: 9 })

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

    output.was()
    db.delete(alice)
    output.was()
    db.create(alice = { name: 'Alice', age: 10 })
    output.was('Alice enters range 10<=x<20',
               'Alice age becomes multiple of ten')
    db.delete(alice)
    output.was('Alice leaves range 10<=x<20',
               'Alice age stops being multiple of ten')
    db.create(alice = { name: 'Alice', age: 10.1 })
    output.was('Alice enters range 10<=x<20')
    db.delete(alice)
    output.was('Alice leaves range 10<=x<20')
    db.create(alice = { name: 'Alice', age: 20 })
    output.was('Alice enters range 20<=x<30',
               'Alice age becomes multiple of ten')
    db.delete(alice)
    output.was('Alice leaves range 20<=x<30',
               'Alice age stops being multiple of ten')
    db.create(alice = { name: 'Alice', age: 21 })
    output.was('Alice enters range 20<=x<30')
  })

}

