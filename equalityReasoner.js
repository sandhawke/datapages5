'use strict'
/*

  Gives a view of the data where some obj's are "about" the same
  thing, and so the data from one carries over to the other.  For
  example:

  db.add({ name: "Alice", age: 30 })
  db.add({ name: "Alice", hairColor: "dark" })
  db.addKey('name')
  db.forEach(x => {
      // x = { name: 'Alice', age:30, hairColor: 'dark' }
  })
  
  uhhhhh.   Can't really be done with current API

  Except, if N pages can be merged, the db creates a new page, and
  db.mergedInto(p1, pmergerd)
  db.mergedInto(p2, pmergerd)

  BUT that would still show through p1 and p2

  db.filter({__smooshedIfPossible: true}).forEach( ... )

  db.on('replace', ... )   or 'merge'N
  ...  p1 and p2 go away, and you get a new one?


  THIS SEEMS OBSCURE, but actually, it's essential to making
  decentralization work!


  Do we need to change dbview?
     ? can you compare with ===
         I think so, because of pointers / graphs

  db.consolidated.forEach( ... )
     the (read-only) consolidated view 

     (rename this to consolidator.js)

     What if you added to it?

     * okay IF that doesn't result in any smooshing, but if it did,
       your object would have to go away, or be taken over?  SO NO.

     What if you changed a property?

     * 
     
   

 */

function EqualityReasoner (backend) extends DBView {

  /*
    Consider this property (or array of properies) to be an
    unambigious property, so that when two obj's have the same value
    for it, they are same-as.

    If it's a subject property, they are sameSubjectAs
    If it's a page property, they are samePageAs

*/
  function addKey (prop) {
  }
  
  function isSameSubjectAs (a, b) {
  }

  function makeSameSubjectAs (a, b) {
  }

  function isSamePageAs (a, b) {
  }

  function makeSamePageAs (a, b) {
  }

  /**
     Set the "reference mode" for given property to be given type,
     which is one of: page, subject, ...

     Needs to be known for every property....    Do we default to 'subject' unless you say 'page'
  */
  function refmode (property, type) {
  }
  
  
}
