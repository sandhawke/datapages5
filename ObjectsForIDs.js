'use strict'

const Base = require('./Base')

class ObjectsForIDs extends Base {
  
  addIgnoringReferences (obj) {
    if (obj.__id) return
    const id = this.addForId()
    for (let prop of Reflect.ownKeys(obj)) {
      this.setById(id, prop, this.encodeValue(obj[prop]))
    }
    obj.__id = id
    this.emit('add', obj)
    return obj
  }

  // TEMP
  delete (x) {
    this.remove(x)
  }
  
  remove (obj) {
    if (!obj.__id) throw Error()
    this.removeById(obj.__id)
    this.emit('remove', obj)
    delete obj.__id
  }

  set (obj, prop, value) {
    if (!obj.__id) throw Error()
    setById (obj.__id, prop, this.encodedValue(value))
    this.emit('set', obj, prop, value)
  }

}

module.exports = ObjectsForIDs
