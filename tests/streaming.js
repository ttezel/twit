var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config = require('../config')
  , colors = require('colors')
  , util = require('util')

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

  it('statuses/filter using `track` and `language`', function (done) {
    var params = {
      track: '#apple',
      language: 'en'
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('stopping & restarting the stream works', function (done) {
    var stream = twit.stream('statuses/sample')

    //stop the stream after 2 seconds
    setTimeout(function () {
      assert.equal(null, stream.abortedBy)
      stream.stop()
      assert.equal('twit-client', stream.abortedBy)
      util.puts('\nstopped stream')
    }, 2000)

    //after 3 seconds, start the stream, and stop after 'connect'
    setTimeout(function () {
      stream.on('connect', function (req) {
        util.puts('\nrestarted stream')
        stream.stop()
        assert.equal('twit-client', stream.abortedBy)
        util.puts('\nstopped stream')
        done()
      })

      //restart the stream
      stream.start()
    }, 3000)
  })

  it('stopping & restarting stream emits to previously assigned callbacks', function (done) {
    var stream = twit.stream('statuses/sample')

    var started = false
    var numTweets = 0
    stream.on('tweet', function (tweet) {
      console.log('\n.')
      if (!started) {
        started = true
        numTweets++
        console.log('received tweet', numTweets)

        console.log('stopping stream')
        stream.stop()
        
        // we've successfully received a new tweet after restarting, test successful
        if (numTweets === 2) {
          done()
        } else {
          started = false
          console.log('restarting stream')

          setTimeout(function () {
            stream.start()
          }, 1000)
        }
      }
    })

    stream.on('limit', function (limitMsg) {
      console.log('limit', limitMsg)
    })

    stream.on('disconnect', function (disconnMsg) {
      console.log('disconnect', disconnMsg)
    })

    stream.on('reconnect', function (req, res, ival) {
      console.log('reconnect', ival)
    })

    stream.on('connect', function (req) {
      console.log('connect')
    })

  })
})