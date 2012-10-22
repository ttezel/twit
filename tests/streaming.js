var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config = require('../config')
  , colors = require('colors')

var twit = new Twit(config);

function checkStream(stream, done) {
  stream.on('tweet', function (tweet) {
    assert.deepEqual(null, stream.abortedBy)
    stream.stop()
    assert.equal('twit-client', stream.abortedBy)

    assert.ok(tweet)
    assert.equal('string', typeof tweet.text)
    assert.equal('string', typeof tweet.id_str)

    done()
  })
}

describe('Streaming API', function () {
  it('statuses/sample', function (done) {
    var stream = twit.stream('statuses/sample')

    checkStream(stream, done)
  })

  it('statuses/filter using `track`', function (done) {
    var stream = twit.stream('statuses/filter', { track: 'apple' })

    checkStream(stream, done)
  })

  it('statuses/filter using `location`', function (done) {
    var stream = twit.stream('statuses/filter', { locations: '-122.75,36.8,121.75,37.8,-74,40,73,41' })

    checkStream(stream, done)
  })

  it('statuses/filter using `location` array', function (done) {
    var params = {
      locations: [ '-122.75', '36.8', '121.75', '37.8', '-74', '40', '73', '41' ]
    }

    var stream = twit.stream('statuses/filter', params)

    checkStream(stream, done)
  })

  it('statuses/filter using `track` array', function (done) {
    var params = {
      track: [ 'spring', 'summer', 'fall', 'winter' ]
    }

    var stream = twit.stream('statuses/filter', params)

    checkStream(stream, done)
  })

  it('stopping & restarting the stream', function (done) {
    var stream = twit.stream('statuses/sample')

    setTimeout(function () {
      assert.equal(null, stream.abortedBy)
      stream.stop()
      assert.equal('twit-client', stream.abortedBy)
      console.log('\nstopped stream')
    }, 2000)

    setTimeout(function () {
      //when stream reconnects, stop it again
      stream.on('connect', function (req) {
        console.log('\nrestarted stream')
        stream.stop()
        assert.equal('twit-client', stream.abortedBy)
        console.log('\nstopped stream')
        done()
      })

      //restart the stream
      stream.start()
    }, 3000)
  })
})