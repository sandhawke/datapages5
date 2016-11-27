'use strict'
/*

  Provides a DB with history and provenance features backed by any
  other DB.

  Actually, the "other DB" only needs to implement :

  - add (where it will only every be handed something
  JSON.stringify can handle)

  - honors on-add and on-stable, so we can async traverse what it's
    got, and know when we're done

  (maybe some kind of delete, or mass delete?  deleteWhere, given a
  function, which it can implement by re-copying)

  In other words, it's easy to implement as a file, or in the browser
  with localStorage or something.  (Arguable we could build on sqlite3 +
  indexDB and have something indexed, so we don't need to keep as much
  in memory.)

*/

const ObjectsForIDs = require('./ObjectsForIDs')
const FilterView = require('./FilterView')
const debug = require('debug')('Sigma')

// this lets the time be the same for all changes in the same tick,
// and avoids people trusting the time too much for sequencing, maybe?
// I've seen systems where the call to get the time was the slowest
// thing, although this probably isn't one of those.
let roughTime = Date.now()
/*  this stops the process from exiting
setInterval( () => {
  roughTime = Date.now()
}, 100)
*/

/*
  Assemble a JS object from transactions that tell us its 'current' state.

  Uses a 'bio' (biography) for the object that looks like this:

  const sampleBio = {
    addedBy: t0,         // oddly useless
    setBy: [t1, t2, t3, t4],
    removedBy: t5
  }

  tFilter is a boolean function telling us which transactions are
  okay to use.  This allows us to ignore transactions from some
  time periods and some writers, etc.

  if provided, target is an obj where keys are property-names for the
  properties we want to gather.  Value is null for the properties we
  want, anything else (eg undefined or a string) for the ones we
  don't.  This object is what's filled in and returned.  Default
  amounts to wanting all properties.

  if sourceRecord, then we'll record there the transaction used for each
  property filled

  if rejectIf, it's a function called on the object as it's being
  built.  If it returns true, it means the object isn't acceptable and
  null is immediately returned.  The target and sourceRecord will have
  been modified.  Some kinds of filter expressions could be implement
  lead to useful rejectIf functions, { foo: 'bar' } ---> rejectIf = x
  => x.foo !== 'bar', but others are more tricky.  Basically, reject
  if target is sufficiently filled in and still failed the filter.
*/

function gatherObject (bio, tFilter, target, sourceRecord, rejectIf) {
  if (!tFilter) tFilter = x => true
  if (bio.removedBy && tFilter(bio.removedBy)) return null
  let wantAllProperties = false
  if (!target) {
    wantAllProperties = true
    target = {}
  }
  for (let i=bio.setBy.length-1; i>=0; i--) {
    const trans = bio[i]
    const prop = trans.property
    if (!tFilter(trans)) continue  // tFilter says ignore this
    if ((wantAllProperties && target[prop] == undefined) ||
        target[prop] === null) {
      target[prop] = trans.value
      if (sourceRecord) sourceRecord[prop] = trans
      if (rejectIf && rejectIf(target)) return null
    }
  }
  return target
}

function updateBiographies (bioMap, t, genid) {
  const id = t.id
  genid.skipPast(id)
  let bio = bioMap.get(id)
  if (!bio) {
    bio = { setBy: [] }
    bioMap.set(id, bio)
  }
  if (t.type === 'set') {
    bio.setBy.push(t)
  } else if (t.type === 'add') {
    bio.addedBy = t
  } else if (t.type === 'remove') {
    bio.removedBy = t
  } else throw Error('unknown transaction type: ' + t.type)
}

function sortSetBy (bioMap) {
  const bySeq = (a, b) => a.seq - b.seq
  for (let bio of bioMap.values()) {
    bio.setBy.sort(bySeq)
  }
}

class Sigma extends ObjectsForIDs {
  constructor (parent) {
    super()
    this._parent = parent

    this._id = 1000
    this._genid = () => {
      return this._id++
    }
    this._genid.skipPast = x => {
      if (x > this._id) this._id = x + 1
    }
    this._startLoading()
  }

  /*
    Traverse the parent to load up our state.  This is async, because
    the parent might be reading a file or something.  But until it's
    done, the object is in an unusable state.  EG, we don't even know
    what ids we can safely use.  check this.loading and/or wait for event
    'loaded'.
  */
  _startLoading () {
    debug('startLoading')
    this.loading = true
    const bioMap = new Map()
    this._bioMap = bioMap
    const myCB = t => updateBiographies(bioMap, t, this._genid)
    debug('startLoading 9')
    this._parent.onWithReplay('appear', myCB)
    debug('startLoading 10')
    this._parent.onceWithReplay('stable', () => {
      debug('startLoading 20')
      // ACTUALLY keep these, this is how we keep the biomap updated
      // as we add data!
      //
      // this._parent.removeListener('add', myCB)
      // this._parent.removeListener('appear', myCB)   // LEGACY

      // but let's make this once?
      sortSetBy(bioMap)
      this.emit('loaded')
      this.loading = false
      debug('loading done')
    })
    this._parent.onWithReplay('stable', () => { this.emit('stable') })
    debug('startLoading 11')
  }

  // TEMP
  create (obj) {
    this.addIgnoringReferences(obj)
  }
  
  addForId () {
    if (this.loading) throw Error('not ready, wait for loaded')
    const id = this._genid()
    debug('*** add, id=', id)
    const t = {
      time: roughTime,
      id: id,
      type: 'add'
    }
    if (this._source) t.source = this._source
    // to be: this.log.addIgnoringReferences(t)
    this._parent.create(t)
    this.emit('add-id', id)   // we don't have the obj to do 'add'
    debug('*** add, returning')
    return id
  }

  removeById (id) {
    const t = {
      time: roughTime,
      id: id,
      type: 'remove'
    }
    if (this._source) t.source = this._source
    this._parent.create(t)
    this.emit('remove-id', id)  // we don't have the obj to do 'remove'
  }

  setById (id, prop, encodedValue) {
    const t = {
      time: roughTime,
      id: id,
      seq: genid(), // we're using ids for these too, because they ascend
      type: 'set',
      propertyName: prop,
      value: encodedValue
    }
    if (this._source) t.source = this._source
    this.log.addIgnoringReferences(t)
    this.emit('set-id', id, prop, value)
  }

  forEach (f) {
    if (this.loading) throw Error('not ready, wait for loaded')
    debug('forEach', this.bioMap)
    for (let bio of this._bioMap.values()) {
      const obj = gatherObject(bio)
      debug('gathered', obj, 'from', bio)
      if (obj) f(obj)
    }
  }

  filter (expr, options) {
    return new SigmaFilterView(this, expr, options)
  }
}

class SigmaFilterView extends FilterView {
  constructor (parent, expr, options) {
    super(parent, expr, options)
    options = options || {}
  }
  
  forEach (f) {
    for (bio of this._bioMap.values()) {
      const target = {}
      if (options.target) Object.assign({}, options.target)
      const obj = gatherObject(bio,
                               options.transactionFilter,
                               target,
                               options.sources)
      if (obj && this._passes(obj)) f(page)
    }
  }
    
}

module.exports = Sigma
module.exports.gatherObject = gatherObject
