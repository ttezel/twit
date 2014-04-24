var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config1 = require('../config1')
  , config2 = require('../config2')
  , colors = require('colors')
  , util = require('util')
  , async = require('async')
  , restTest = require('./rest')

/**
 * Stop the stream and check the tweet we got back.
 * Call @done on completion.
 *
 * @param  {object}   stream object returned by twit.stream()
 * @param  {Function} done   completion callback
 */
exports.checkStream = function (stream, done) {
  stream.once('connected', function () {
    console.log('\nconnected'.grey)

    stream.once('tweet', function (tweet) {
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
    var twit = new Twit(config1);
    var stream = twit.stream('statuses/sample')

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track`', function (done) {
    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter', { track: 'apple' })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location`', function (done) {
    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter', { locations: '-122.75,36.8,121.75,37.8,-74,40,73,41' })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location` array for San Francisco', function (done) {
    var twit = new Twit(config1);
    var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

    var stream = twit.stream('statuses/filter', { locations: sanFrancisco })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `location` array for San Francisco and New York', function (done) {
    var twit = new Twit(config1);
    var params = {
      locations: [ '-122.75', '36.8', '121.75', '37.8', '-74', '40', '73', '41' ]
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track` array', function (done) {
    var twit = new Twit(config1);
    var params = {
      track: [ 'spring', 'summer', 'fall', 'winter', 'weather', 'joy', 'laugh', 'sleep' ]
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track` and `language`', function (done) {
    var twit = new Twit(config1);
    var params = {
      track: [ '#apple', 'google', 'twitter', 'facebook', 'happy', 'party', ':)' ],
      language: 'en'
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('stopping & restarting the stream works', function (done) {
    var twit = new Twit(config1);
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
      stream.once('connected', function (req) {
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
    var twit = new Twit(config1);
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

describe('streaming API events', function () {
    var senderScreenName
    var receiverScreenName

    var dmId
    var twit, twit2

    before(function (done) {
      // before we send direct messages the user receiving the msg
      // has to follow the sender
      twit = new Twit(config1);
      twit2 = new Twit(config2);

      async.parallel({
        // get sender screen name and set it for tests to use
        getSenderScreenName: function (parNext) {
          twit.get('account/verify_credentials', function (err, reply) {
            assert(!err, err)

            assert(reply)
            assert(reply.screen_name)

            senderScreenName = reply.screen_name

            return parNext()
          })
        },
        // get receiver screen name and set it for tests to use
        getReceiverScreenName: function (parNext) {
          twit2.get('account/verify_credentials', function (err, reply) {
            assert(!err, err)

            assert(reply)
            assert(reply.screen_name)

            receiverScreenName = reply.screen_name

            return parNext()
          })
        }
      }, function (err) {
        assert(!err, err)

        var followParams = { screen_name: senderScreenName }

        // make receiver (twit2) follow sender (twit)
        twit2.post('friendships/create', followParams, function (err, reply) {
          assert(!err, err)
          assert(reply.following)

          done()
        })
      })
    })

    it('direct_message event', function (done) {

      var dmParams = {
        screen_name: receiverScreenName,
        text: 'direct message streaming event test! :-)'
      }

      // start listening for user stream events
      var receiverStream = twit2.stream('user')

      async.parallel({
        listenForDm: function (parNext) {
          console.log('\nlistening for DMs')
          // listen for direct_message event and check DM once it's received
          receiverStream.once('direct_message', function (directMsg) {
            console.log('got DM')
            restTest.checkDm(directMsg.direct_message)

            assert.equal(directMsg.direct_message.text, dmParams.text)
            assert.equal(directMsg.direct_message.sender.screen_name, senderScreenName)

            receiverStream.stop()

            return parNext()
          })
        },
        sendDm: function (parNext) {
          // post a direct message from the sender's account
          console.log('posting DM')
          twit.post('direct_messages/new', dmParams, function (err, reply) {
            assert(!err, err)
            assert(reply)

            dmId = reply.id_str
            assert(dmId)

            restTest.checkDm(reply)

            assert.equal(reply.text, dmParams.text)

            return parNext()
          })
        }
      }, done)
    })

    after(function (done) {
      assert(dmId)
      assert.equal(typeof dmId, 'string')
      twit.post('direct_messages/destroy', { id: dmId }, function (err, reply) {
        assert(!err, err)
        restTest.checkDm(reply)
        assert.equal(reply.id, dmId)

        return done()
      })
    })
})