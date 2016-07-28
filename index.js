'use strict'

const memstore = require('./memstore')
const filestore = require('./filestore')

module.exports.useFiles = filestore.create
module.exports.filestore = filestore.create
module.exports.memstore = memstore.create

