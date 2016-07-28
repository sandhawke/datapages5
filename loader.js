'use strict'

var file = require('file')

function run (db, root) {
  file.walkSync(root, (dirPath, dirs, files) => {
    console.log('files', dirPath, files)
    for (let f of files) {
      if (f.endsWith('.json')) {
        let m = require(dirPath + '/' + f)  /// WE COMPLETELY TRUST THESE FILES
        db.create(m)
      }
    }
  })
}

module.exports.run = run
