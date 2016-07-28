Datapages -- streaming json database manager
============================================

_Everything should be made as simple as possible, but not simpler_ -- [Einstein](http://quoteinvestigator.com/2011/05/13/einstein-simple/)

Features (some not yet implemented):

* Very fast for small datasets (thousands of records)
* Data records are JSON-compatible JavaScript objects
* Objects can refer to each other naturally (like `alice.mother.mother.age`, cycles are okay)
* Instances can be linked into a federation (eg between web client and web server), with efficient propagation
* Easy to build live displays of dynamically-changing query results (no
polling)
* Supports transient records, aka event streaming
* Supports streaming attached media blobs, eg JPEGs
* Works with https://github.com/sandhawke/vocabspec[vocabspec] to handle
schema validation, migration (with views), and integration
* Supports temporal and provenance features (only show data resulting from sources users a and b before time t)
* Supports access control for use in multiuser backends

Install like:

```shell
npm install --save datapages
```

Use like:

```js
const datapages = require('datapages')

const db = datapages.inmem()

db.on('appear', page => {
   console.log('new page', page)
})

const alice = { name: 'Alice', age: 30 }
const bob =   { bob:  'Bob', age: 29 }

db.create(alice)
// => new page { name: 'Alice', age: 30 }
db.create(bob)
// => new page { bob:  'Bob', age: 29 }
db.filter({ age: { $lt: 30 }})
  .on('appear', page => {
   console.log(name, 'is under 30')
   // => Bob is under 30
})
```

For all the details see the
[interface-spec](interface-spec.html)
or the
[test suite](test)




