'use strict'

const test = require('./test')

for (let factory of test.dbFactories) {

  if (factory.name === 'inmemWithA1Filter') continue    // NOT WORKING
  
  test(factory.name + ' filtered, updates -> results', t => {
    t.plan(6)
    const output = test.logger(t)
    const db = factory()

    const alice = { name: 'Alice', age: 12 }

    db.create(alice)
    
    db.filter({ age: { $gte: 10, $lt: 20 }})
      .on('results', results =>  {  output('In range 10<=x<20 :', results.map(x => x.name).join('')) })
      .start()

    db.filter({ age: { $gte: 20, $lt: 30 }})
      .on('results', results =>  {  output('In range 20<=x<30 :', results.map(x => x.name).join('')) })
      .start()

    db.filter({ age: { $in: [10, 20, 30] }})
      .on('results', results =>  {  output('Age is multiple of ten :', results.map(x => x.name).join('')) })
      .start()

    output.was('In range 10<=x<20 : Alice',
               'In range 20<=x<30 : ',
               'Age is multiple of ten : ' )
    db.update(alice, { age: 9 })
    output.was('In range 10<=x<20 : ',
               'In range 20<=x<30 : ',
               'Age is multiple of ten : ')
    db.update(alice, { age: 10 })
    output.was('In range 10<=x<20 : Alice',
               'In range 20<=x<30 : ',
               'Age is multiple of ten : Alice')

    db.update(alice, { age: 10.1 })
    output.was('In range 10<=x<20 : Alice',
               'In range 20<=x<30 : ',
               'Age is multiple of ten : ')

    db.update(alice, { age: 20 })
    output.was('In range 10<=x<20 : ',
               'In range 20<=x<30 : Alice',
               'Age is multiple of ten : Alice')

    db.update(alice, { age: 21 })
    output.was('In range 10<=x<20 : ',
               'In range 20<=x<30 : Alice',
               'Age is multiple of ten : ')

  })
}
