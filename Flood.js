'use strict'

/*
  Connect a bunch of dbs via streamers, so they all stay in sync.

  Currently uses as linear topology.  Each new db syncs with the
  previous db.   No idea how that compares to star, or whatever.

  const f = new Flood(db1, db2, db3)

  // immediately starts streaming everything in db1 to db2, and
  // everything in db2 to db1 and db3, and everything in db3 to db2.
  // Continues, so everything in db1 and db3 will reach each other via
  // db2.

  f.add(db4)   // adds db4 syncing with db3, etc

*/

const Streamer = require('./Streamer')
const debug = require('debug')('Flood')

class Flood {

  constructor (...dbs) {
    const dbs = []
    const nexts = []
    const prevs = []

    function add (db) {
      const index = dbs.length
      const myNext = new Streamer(db)
      const myPrev = new Streamer(db)
      dbs.push(db)
      nexts.push(myNext)
      prevs.push(myPrev)
      if (index > 0) {
        const prevNext = nexts[index - 1]
        myPrev.streamTo(prevNext, true)
        prevNext.streamTo(myPrev, true)
      }
    }
    
    dbs.forEach(db => add(db))

    this.add = add
  }
}


module.exports = Flood
