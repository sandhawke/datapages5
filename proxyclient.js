'use strict'
/*

  Looks like a db...

  Actually doesn't store anything, just relays everything to an
  eventemitter.  We us ee.emit(event, obj) to send to the server and
  ee.on/off/once(event, cb) to hear back.  Someone else can turn those
  into postMessage or websockets or REST or whatever you want.

*/


function proxyclient (ee) {
  const db = {}

  function create (source, onsave) {
    const id = genid()
    source.id = id
    function cb (page) {
      if (page.id === id) {
        ee.off('saved', cb)
      }
    }
    ee.on('saved', cb)
    // but what about errors?
    
    // or more like ...
    ee.once(responseId, onsave)

    // and it's not onsave so much as done  (err, updatesSo Far)
    ee.emit('create', source)
  }

  db.create = create
  return db
}
