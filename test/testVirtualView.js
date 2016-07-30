'use strict'

const test = require('./test')
const datapages = require('..')
const VirtualView = require('../VirtualView')

test.skip(t => {
  const givens = new datapages.InMem()
  const view = new VirtualView()
  const output = test.logger(t)

  let sam = givens.create({ name: 'Sam' })
  let classical = givens.create({ name: 'Classical' })
  let mozart = givens.create({ name: 'Mozart',
                               genre: classical,
                               isArtist: true })
  let g1 = givens.create({ name: 'sam-likes-classical',
                           subject: sam,
                           likesGenre: classical })

  givens.on('results', all => {
    output('givens:', all.map(x => x.name).join(', '))
  })
  output.was('givens: Sam, Classical, Mozart, sam-likes-classical')

  // at some point we'll use options { wanted: ['mightLikeArtist'] }
  // to get it to give us mozart.
  view.filter({ subject: sam, mightLikeArtist: mozart })
    .on('results', all => {
      output('view:', all.map(x => x.name).join(', '))
    })

  view.addPageRule(function suggestArtist (subject, mightLikeArtist) {
    this.filter({ subject: subject, likesGenre: {$exists: true}})
      .on('appear', (p1) => {
        this.filter({ artist: mightLikeArtist, genre: p1.genre })
          .on('appear', (p2) => {
            this.create({ name: 'created', subject: subject,
                          mightLikeArtist: p2}) 
          })
      })
  })

  /*   okay, that's not the nicest syntax.

       and that's without supporting disappear

       can we add some helper functions?

       or should we just use a rule language?

       forall person, genre, artist
       if person.likesGenre === artist.genre
       then { person: person, mightListArtist: artist }

       which is more like we'd naturally write for forward chaining,
       as in last nights ruleengine.js

       addPageRule({forall: ['x', 'y', 'z'],
                    when: "x.foo === y.bar + z.foo"
                    assert: {
                    
                    }

   */
  
  view.addPageRule({
    forall: {    // just helps with performance, code quality
      listener: { isPerson: true },
      artist: { isArtist: true },
      genreLiking: { isGenreLiking: true }
    },
    when: 'artist.genre === genreLiking.genre',
    assert: { subject: {ref: listener},
              mightLike: {ref: artist} }
  })
  
  output.was('view: created')
  
  t.end()
})

