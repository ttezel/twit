var Twit = require('../lib/twitter')
  , config = require('../config')
  , colors = require('colors')

/*
skip this test unless specifically needed, since twitter tolerates
multiple connections sometimes, and sometimes not.

Twitter is not consistent enough to merit running this every time
and expecting extra streams to close. If running this test, increase
the test timeout to make sure twitter sends back `disconnect` objects 
before the timeout.
 */
describe.skip('multiple connections', function () {
    var twit = new Twit(config)

    var streamFoo = twit.stream('statuses/sample')
    var streamBar = twit.stream('statuses/sample')

    it('results in one of the streams closing', function (done) {
        streamFoo.on('disconnect', function (disconnect) {
          assert.equal(typeof disconnect, 'object')
          assert.equal(streamFoo.abortedBy, 'twit-client')
          done()
        })

        streamBar.on('disconnect', function (disconnect) {
          assert.equal(typeof disconnect, 'object')
          assert.equal(streamBar.abortedBy, 'twit-client')
          done()
        })
    })
})
