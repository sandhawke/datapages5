'use strict'
/*

  Looks like a db, but does caching in case underlying db is slow.

  given

  db2 = cache(db1))

  db2 and db1 should be indistinguishable, except in terms of
  performance.

  There might be different strategies at some point.  Basically how
  aggressive to be about reading ahead, and keeping stuff for a while
  after it's used.  Maybe we'll have some options at some point.
  Hopefully it can auto-tune well enough.

  MAYBE this should work on ee's not dbs?  So it can pass stuff it
  doesn't know about, straight through?  No, anything it doesn't know
  about might cause problems.   It needs to understand the whole API.

*/

