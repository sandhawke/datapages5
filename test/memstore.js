'use strict'

const test = require('tape')
const dp = require('..')

test('create then replay-watch', t => {
  t.plan(2)
  const db = dp.memstore()
  const source = {alice: 10}
  const page = db.create(source)
  t.notEqual(page, source)
  db.watch(true, (err,event) => {
    t.deepEqual(event.created, [page])
  })
})

test('watch then create', t => {
  t.plan(1)
  const db = dp.memstore()
  const source = {alice: 10}
  db.watch(false, (err,event) => {
    // can't check return value from db.create, since it hasn't returned yet
    t.deepEqual(event.created, [source])
  })
  db.create(source)
})


