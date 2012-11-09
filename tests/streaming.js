var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config = require('../config')
  , colors = require('colors')

var twit = new Twit(config);

/**
 * Stop the stream and check the tweet we got back.
 * Call @done on completion.
 * 
 * @param  {object}   stream object returned by twit.stream()
 * @param  {Function} done   completion callback
 */
function checkStream(stream, done) {
  stream.on('connect', function () {
    console.log('\nconnected'.grey)

    stream.on('tweet', function (tweet) {
      assert.equal(null, stream.abortedBy)

      stream.stop()

      assert.equal('twit-client', stream.abortedBy)
      assert.ok(tweet)
      assert.equal('string', typeof tweet.text)
      assert.equal('string', typeof tweet.id_str)

      console.log(('\ntweet: '+tweet.text).grey)

      done()
    })
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

  it('statuses/filter using `location` array for San Francisco', function (done) {
    var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

    var stream = twit.stream('statuses/filter', { locations: sanFrancisco })

    checkStream(stream, done)
  })

  it('statuses/filter using `location` array for San Francisco and New York', function (done) {
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

  it('user stream first tweet is an array of friend id\'s', function (done) {
    var stream = twit.stream('user')

    //make sure we're connected to the right endpoint
    assert.equal(stream.path, 'https://userstream.twitter.com/1.1/user.json')

    //first tweet should be an array of friend id's. Validate it.
    stream.on('tweet', function (tweet) {
      stream.stop()
      assert.equal('twit-client', stream.abortedBy)
      assert.ok(Array.isArray(tweet.friends))
      done()
    })
  })
})