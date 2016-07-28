'use strict'
/*

  Wraps an append-only db, where every page is "delta" (aka update,
  aka transaction) to produce a full db.

*/

function sigma (deltas) {
  const db = new EventEmitter()

  function create (source, done) {
    deltas.create({createFrom: source}, done)  // TRUSTING source wont change
  }

  function update (before, overlay) {
    // we can't just store the overlay in deltas, because it uses null
    const remove = []
    for (prop of Object.getOwnPropertyNames(overlay)) {
      if (overlay[prop] === null) {
        remove.push(prop)
        delete overlay[prop]   // CHANGING overlay
      }
    }
    deltas.create({update: before.id, newValues: overlay, remove: remove})
  }

  // ... MORE TO DO  delete, filter, sort, limit, ... the events ...

  db.create = create
  db.update = update
  db.deltas = ddb
  return db
}
  
