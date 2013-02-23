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
exports.checkStream = function (stream, done) {
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

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track`', function (done) {
    var stream = twit.stream('statuses/filter', { track: 'apple' })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location`', function (done) {
    var stream = twit.stream('statuses/filter', { locations: '-122.75,36.8,121.75,37.8,-74,40,73,41' })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location` array for San Francisco', function (done) {
    var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

    var stream = twit.stream('statuses/filter', { locations: sanFrancisco })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location` array for San Francisco and New York', function (done) {
    var params = {
      locations: [ '-122.75', '36.8', '121.75', '37.8', '-74', '40', '73', '41' ]
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track` array', function (done) {
    var params = {
      track: [ 'spring', 'summer', 'fall', 'winter' ]
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('stopping & restarting the stream', function (done) {
    var stream = twit.stream('statuses/sample')

    //stop the stream after 2 seconds
    setTimeout(function () {
      assert.equal(null, stream.abortedBy)
      stream.stop()
      assert.equal('twit-client', stream.abortedBy)
      console.log('\nstopped stream')
    }, 2000)

    //after 3 seconds, start the stream, and stop after 'connect'
    setTimeout(function () {
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