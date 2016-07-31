'use strict'

const test = require('./test')
const datapages = require('..')

test.skip('datalog', t => {
  const output = test.logger(t)

  const alice = datapages.inmem()
  let a1 = alice.create({ name: 'Alice', age: 31 })

  const r = datapages.datalog(alice)
  r.addRule('name age', 'ageInDays', (name, age) => {
    let nameInDays = age*365;
    return nameInDays
  })

  r.addRule(page => {
    page.nameInDays = page.age * 365
  })

  // I think I like this best
  // still involves parsing f.toString, but only the opening part
  // to make it work
  r.addVirtualProperty('nameInDays', (name, age) => {
    return age*365
  })

  HORN:
  
  r.addVirtualPage({ name: (p1,p2) => p1 === p2 && p1.name,
                     ageInDays: (p1) => p1.age *365 }) 

  match { .... } as p1
  and { ... } as p2
  then exists p3 ....


  for all p1, p2
  if p1.foo = p2.bar && etc.
    then add { .... }
  

  r.addVirtualPage( { oldperson: { age: {$gr: 80} },
                      person: { isPerson: true } },
                    soln => {
                        ... do stuff with sold.oldperson & soln.person ...
                        ... to produce & return new object ...
                      return { new obj... }
                    })

  r.addVirtualPage( { person: { hasParent: {$exists: true} } },
                    s => {
                      return { s
                             })

                  )

  r.hornRule( { hasParent: {$exists: true}}, { hasBrother: {$exists: true}},
              (child, parent) =>
              if child.parent === parent {
                return { name: child.name, hasUncle: parent.hasBrother.name }
              }
            )

  // maybe it'll start to look more reasonable if/when we're using a
  // clause-based query language instead of the mongoDB style?

  filter([['name', '=', 'someValue'],
          ['age', '>', 80],
          ['brother', '=', {var: 'x'}]])

  // n3 is starting to look mighty nice.

  if p(x) and p(x(c)) then create { foo: x }

  x.hornRule( (child, parent, brother) => {
    if (child.parent === parent &&
        parent.brother === brother) {
      return { isRel: true, from: child, to: brother, rel: 'uncle'} 
    }
  })

  db.pageCreationRule( f )

  f is called with each possible combination of pages for its
  parameters, then returns null or returns a new page

    IN FACT, we can compile it and run it much better,
  but it can have those semantics.

  
  db.propertyRule( propname, f )

  f is called with each object, and returns a value for propname of that object





  const engine = datapages.ruleengine(db)
  engine.virtualPageLookup([likely page properties...], func)
  // func is a results/appear/disappear/update emitter on that page,
  // like lookup is.   Wait can there be more than one?   In that
  // case it's more like  filterVirtualPages
  // but maybe that's just  engine.filter(...)
  //
  //
  engine.addQueryRule([output properties], func-to-build-view)

  // is it allowd to return existing pages?  or only ones it created?
  // IE what is page identity?
  
  t.end()
})
