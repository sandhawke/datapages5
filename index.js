'use strict'


module.exports.InMem = require('./InMem')
module.exports.AuthView = require('./AuthView')
module.exports.MemLogBased = require('./MemLogBased')
module.exports.Multisource = require('./Multisource')
module.exports.Sigma = require('./Sigma')

// define dp.inmem(x) === new dp.InMem(x)
for (let x of Reflect.ownKeys(module.exports)) {
  const Class = module.exports[x]
  module.exports[x.toLowerCase()] = (...a) => new Class(...a)
}

