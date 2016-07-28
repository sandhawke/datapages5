'use strict'

const test = require('tape')
const datapages = require('..')
const file = require('file')
const del = require('del')

function tmpdir (name = "main") {
  const dir = __dirname + '/temp/' + name
  del.sync(dir, {dryRun: false})
  file.mkdirsSync(dir)
  return dir
}

test('filestore: create, add, re-create, then replay-watch', t => {
  t.plan(1)
  const dir = tmpdir()
  const db1 = datapages.filestore(dir)
  const source = {alice: 10}
  db1.create(source, (page) => {
    source.id = page.id // so deepEqual matches on the id part
    const db2 = datapages.filestore(dir)
    db2.watch(true, (err,event) => {
      t.deepEqual(event.created, [source])
    })
  })
})

test('write media, read it back', t => {
  t.plan(3)
  const instuff = 'Hello, World!'
  const dir = tmpdir()
  const db = datapages.filestore(dir)
  const source = {alice: 10}
  const pg = db.create(source)
  db.watch(false, (err,event) => {
    if (event.updated) {
      const pg2 = event.updated[0]
      if (pg.mediaType) {
        t.equal(pg, pg2)
        t.equal(pg2.mediaType, 'text/plain')
        const r = db.mediaReader(pg)
        r.setEncoding('utf8')
        r.on('readable', () => {
          const outstuff = r.read()
          if (outstuff) {
            console.log('read', outstuff)
            t.equal(outstuff, instuff)
            t.end()
          }
        })
      }
    }
  })

  db.mediaWriter(pg, 'text/plain').end(instuff)
})
