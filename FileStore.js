'use strict'
/*

  Implements a variation on the normal API that's more suited to data
  being storred in a growing logfile

  Someday maybe factor out a 'linefile' or something

  SOMEDAY add compaction at load time when warrented: The first line
  is padded so we can re-write it.  Maybe some others are to allow
  SOME updating.  (If this were binary, we could at least update
  numbers.)  In particular, we can store there the number of bytes
  that would be freed by compaction and during the readthrough, we
  could be writing a compacted version.  And we can start writing
  (after seek to what we know will be the end)

*/

const debug = require('debug')('FileStore')
const opqueue = require('./opqueue')
const fs = require('fs')
const path = require('path')
const util = require('util')

// this is only for the convenience of admin looking at the database
// on disk in raw form
const types = {
  'text/plain': 'txt',
  'application/json': 'json',
  'image/jpeg': 'jpeg'
}

class FileStore {

  // if readyToAdd is falsy, this is a synchronous call while it asks
  // the OS for the size of the file.  Should be pretty quick.
  constructor (dirname, perItemCallback, readingDone, readyToAdd) {
    this._filename = path.join(dirname, 'data.jsonlines')
    if (!readingDone) readingDone = () => true

    this._startLoading(perItemCallback, readingDone)
    this._determineNextId(readyToAdd)
    // it's kind of arbitrary, but let's keep this last, since the
    // above steps affect the caller, and this is silently queued
    this._startWriting()
  }

  _startLoading (perItemCallback, readingDone) {
    const options = { flags: 'r',
                      encoding: 'utf8',
                      autoClose: true }
    const r = fs.createReadStream(this._filename, options)
    let leftover = ''
    let lineNumber = 0
    let pos = 0
    r.on('error', err => {
      if (err.code === 'ENOENT') {
        // just let it go, it's fine if the file doesn't exist
      } else {
        throw err
      }
    })
    r.on('data', chunk => {
      const lines = chunk.split('\n')
      lines[0] = leftover + lines[0]
      // if we end with a newline, split makes the last item be "";
      // otherwise, it'll be the stuff that's leftover, so conveniently:
      leftover = lines.pop()
      for (let line of lines) {
        lineNumber++
        if (!line.startsWith('/')) {
          let obj 
          try {
            obj = JSON.parse(line)
          } catch (e) {
            throw('JSON parse error at ' + this._filename +
                  ':' + lineNumber + '\n>>> ' + util.format('%s', line))
          }
          perItemCallback(pos, obj)
        } else {
          // flagged as removed
        }
        // not a great way to get the length, but arg...
        pos += 1 + (Buffer.from(line, 'utf8')).length
      }
    })
    r.on('end', () => {
      if (leftover.length > 0) {
        throw('missing newline at end of ' + this._filename)
      }
      debug('all items read from', this._filename)
      readingDone()
    })
  }

  _determineNextId (readyToAdd) {
    // we can get the stats in parallel with the open-for-writing
    const gotStats = (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          this._nextId = 0
          // no stats, but .. I don't think anyone will mind?
        } else {
          throw Error(err)
        }
      } else {
        this._stats = stats
        this._nextId = stats.size
      }
      this.ready = true
      debug('ready with nextId =', this._nextId, this._filename)
      if (readyToAdd) readyToAdd() // the nextId is all we needed
    }
    
    this.ready = false
    if (readyToAdd) {
      fs.stat(this._filename, gotStats)
    } else {
      try {
        gotStats(null, fs.statSync(this._filename))
      } catch (err) {
        gotStats(err)
      }
    }
  }

  _startWriting () {
    const openWriteFile = done => {
      /*
        O_SYNC 	Flag indicating that the file is opened for synchronous I/O.

        O_DIRECT When set, an attempt will be made to minimize caching
        effects of file I/O

        fs.fsync(fd, callback)
      */
      debug('open-for-write STARTED')
      const flags = fs.constants.O_WRONLY |
            fs.constants.O_CREAT // | fs.constants.O_DIRECT
        fs.open(this._filename, flags, (err, fd) => {
          if (err) throw Error(err)
          debug('open-for-write done, fd=', fd, this)
          this._fd = fd
          done()
        })
    }
    openWriteFile.debugname = 'openWriteFile'

    this._writeQ = opqueue(() => {
      debug('write queue now empty', this._filename)
    })
    this._writeQ.push(openWriteFile)
    debug('queue ready for writing to', this._filename)
  }
  
  save (item, saved) {
    if (!this.ready) throw Error('not ready')
    const buf = Buffer.from(JSON.stringify(item) + '\n', 'utf8')
    const id = this._nextId
    this._nextId += buf.length
    const func = (done) => {
      fs.write(this._fd, buf, 0, buf.length, id, () => {
        done()
        if (saved) saved()
      })
    }
    func.debugname = 'write (' + buf + ')'
    this._writeQ.push(func)
    return id
  }

  /*
    Seek to the id, write the bytes '//' (which will always be over
    '{"' since we're writing JSON lines)
  */
  removeById (id, removeDone) {
    const buf = Buffer('//', 'ascii')
    const func = (writeDone) => {
      fs.write(this._fd, buf, 0, buf.length, id, () => {
        writeDone()
        removeDone()
      })
    }
    func.debugname = 'remove ' + id
    this._writeQ.push(func)
  }

  /*
    media(shouldBeMediaFlename (item, mediaType) {
    if (!item.id) {
    giveId(item)
    }
    item.__url = webPrefix + item.id
    if (mediaType) {
    item.__mediaURL = item.__url + '__media'
    let suffix = types[mediaType]
    if (!suffix) {
    suffix = mediaType.replace(/[^0-9a-zA-Z.]/i, '_')
    // bug: if someone changes the media type, well wont
    // see the data any more.   delete should delete ALL
    // __media.* files, but we could gather garbage before
    // that.
    }
    return root + '/' + item.id + '__media.' + suffix
    } else {
    return root + '/' + item.id + '.json'
    }
    }

    mediaReader = (pg, options) => {
    // we should do more option checking and error checking, but this
    // gives us the basic idea for now
    if (!pg.mediaType || pg.mediaWriteInProgress) {
    return null
    }
    return fs.createReadStream(filename(pg, pg.mediaType), options)
    }

    mediaWriter = (pg, mediaType, optionsIn) => {
    const options = Object.assign(optionsIn || {})
    options.flags = 'w'
    if (pg.mediaWriteInProgress) {
    return null // in theory, we could return a passthrough stream
    // which is paused until writing is allowed....
    } else {
    db.update(pg, {mediaWriteInProgress: true})
    }
    const s = fs.createWriteStream(filename(pg, mediaType), options)
    s.on('close', () => {
    db.update(pg, {
    mediaType: mediaType,
    mediaBytes: s.bytesWritten,
    mediaWriteInProgress: null
    })
    })
    return s
    }

  */

}

module.exports = FileStore
