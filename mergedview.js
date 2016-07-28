'use strict'

function mergedview (core) {
  const db = {}   // new ee really
  const peers = []

  // options includes a timeout?    a way to detach?
  function attach (source, options) {
    // adjust an existing peer or add a new one
  }

  // pass this on, and pass the results back
  //
  // but ... what about sort and limit and such?
  //
  // the thing we return needs to be the right kind of thing...
  //
  // maybe we should do a clean implemention of memstore with
  // those features first, where query returns a full db
  function query (expr) {

    
  }
  
  db.create = core.create
  db.update = core.update
  db.delete = core.delete
  db.query = query
  db.attach = attach
  return db
}
