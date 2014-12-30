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
  stream.on('connected', function () {
    console.log('\nconnected'.grey)
  });

  stream.once('tweet', function (tweet) {
    assert.equal(null, stream.abortedBy)

    stream.stop()

    assert.equal('twit-client', stream.abortedBy)
    assert.ok(tweet)
    assert.equal('string', typeof tweet.text)
    assert.equal('string', typeof tweet.id_str)

    console.log(('\ntweet: '+tweet.text).grey)

    done()
  });

  stream.on('reconnect', function (req, res) {
    console.log('Got disconnected. Scheduling reconnect! statusCode:', res.statusCode)
  });
}

/**
 * Check the stream state is correctly set for a stopped stream.
 *
 * @param  {object}   stream object returned by twit.stream()
 */
exports.checkStreamStopState = function (stream) {
  assert.strictEqual('twit-client', stream.abortedBy)
  assert.strictEqual(stream.connectInterval, 0)
  assert.strictEqual(stream.usedFirstReconnect, false)
  assert.strictEqual(stream.request, undefined)
  assert.strictEqual(stream.scheduledReconnect, null)
  assert.strictEqual(stream.stallAbortTimeout, null)
}

var generateRandomString = function (length) {
  var length = length || 10
  var ret = ''
  for (var i = 0; i < length; i++) {
    // use an easy set of unicode as an alphabet - twitter won't reformat them
    // which makes testing easier
    ret += String.fromCharCode(Math.floor(Math.random()*90) + 33)
  }

  ret = encodeURI(ret)

  return ret
}

describe('Streaming API', function () {

  it('statuses/sample', function (done) {
    var twit = new Twit(config1);
    var stream = twit.stream('statuses/sample')

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track`', function (done) {
    this.timeout(120000)
    var twit = new Twit(config2);
    var stream = twit.stream('statuses/filter', { track: 'fun' })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `locations` string', function (done) {
    var twit = new Twit(config1);
    var world = '-180,-90,180,90';
    var stream = twit.stream('statuses/filter', { locations: world })

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `locations` array for San Francisco and New York', function (done) {
    var twit = new Twit(config2);
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
    var twit = new Twit(config2);
    var stream = twit.stream('statuses/sample')

    //stop the stream after 2 seconds
    setTimeout(function () {
      assert.equal(null, stream.abortedBy)
      stream.stop()

      exports.checkStreamStopState(stream)

      util.puts('\nstopped stream')
    }, 2000)

    //after 3 seconds, start the stream, and stop after 'connect'
    setTimeout(function () {
      stream.once('connected', function (req) {
        util.puts('\nrestarted stream')
        stream.stop()

        exports.checkStreamStopState(stream)

        util.puts('\nstopped stream')
        done()
      })

      //restart the stream
      stream.start()
    }, 3000)
  })

  it('stopping & restarting stream emits to previously assigned callbacks', function (done) {
    var twit = new Twit(config2);
    var stream = twit.stream('statuses/sample')

    var started = false
    var numTweets = 0
    stream.on('tweet', function (tweet) {
      process.stdout.write('.')
      if (!started) {
        started = true
        numTweets++
        console.log('received tweet', numTweets)

        console.log('stopping stream')
        stream.stop()

        exports.checkStreamStopState(stream)

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
      console.log('reconnect. statusCode:', res.statusCode, 'interval:', ival)
    })

    stream.on('connect', function (req) {
      console.log('connect')
    })

  })
})

describe('streaming API direct message events', function () {
    var senderScreenName;
    var receiverScreenName;
    var twitSender;
    var twitReceiver;
    var dmIdStr;
    var dmIdStrsReceived = [];

    // before we send direct messages the user receiving the DM
    // has to follow the sender. Make this so.
    before(function (done) {
      twitSender = new Twit(config1);
      twitReceiver = new Twit(config2);

      // get sender/receiver names in parallel, then make the receiver follow the sender
      async.parallel({
        // get sender screen name and set it for tests to use
        getSenderScreenName: function (parNext) {
          console.log('getting sender user screen_name')

          twitSender.get('account/verify_credentials', { twit_options: { retry: true } }, function (err, reply) {
            assert(!err, err)

            assert(reply)
            assert(reply.screen_name)

            senderScreenName = reply.screen_name

            return parNext()
          })
        },
        // get receiver screen name and set it for tests to use
        getReceiverScreenName: function (parNext) {
          console.log('getting receiver user screen_name')
          twitReceiver.get('account/verify_credentials', { twit_options: { retry: true } }, function (err, reply) {
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
        console.log('making receiver user follow the sender user')
        // make receiver follow sender
        twitReceiver.post('friendships/create', followParams, function (err, reply) {
          assert(!err, err)
          assert(reply.following)

          done()
        })
      })
    })

    it('receiver stream gets DM event', function (done) {
      this.timeout(0);

      // build out DM params
      function makeDmParams () {
        return {
          screen_name: receiverScreenName,
          text: generateRandomString(5) + ' direct message streaming event test! :-) ' + generateRandomString(20),
          twit_options: {
            retry: true
          }
        }
      }

      // check if we got our sent DM, and end the test if so.
      function endIfDmReceived () {
        if (dmIdStrsReceived.indexOf(dmIdStr) !== -1) {
          receiverStream.stop()
          return done()
        }

        console.log('Still waiting. DMs received:', dmIdStrsReceived)
      }

      function sendDm () {
        var dmParams = makeDmParams()

        twitSender.post('direct_messages/new', dmParams, function (err, reply) {
          assert(!err, err)
          assert(reply)
          restTest.checkDm(reply)
          console.log('posted DM:', reply.text)

          dmIdStr = reply.id_str
          assert(dmIdStr)

          endIfDmReceived()
        })
      }

      // start listening for user events on receiver's account
      var receiverStream = twitReceiver.stream('user')

      receiverStream.on('reconnect', function (request, response, connectInterval) {
        console.log('stream reconnect: response status code', response.statusCode, 'connecting in', connectInterval)
      });

      // listen for direct_message events and wait for our sent DM to be received
      receiverStream.on('direct_message', function (directMsg) {
        console.log('got DM:', directMsg.direct_message.text, 'dmId:', directMsg.direct_message.id_str)
        restTest.checkDm(directMsg.direct_message)

        dmIdStrsReceived.push(directMsg.direct_message.id_str)

        endIfDmReceived()
      })

      // once receiver's stream is connected, send a DM to the receiver
      receiverStream.on('connected', function () {
          sendDm()
      })
    })
})

describe('streaming API bad request', function (done) {
  it('emits an error for a 401 response', function (done) {
    var badCredentials = {
        consumer_key: 'a'
      , consumer_secret: 'b'
      , access_token: 'c'
      , access_token_secret: 'd'
    }

    var twit = new Twit(badCredentials);

    var stream = twit.stream('statuses/filter', { track : ['foo'] });

    stream.on('error', function (err) {
      assert.equal(err.response.statusCode, 401)

      return done()
    })
  })
})

describe.skip('streaming reconnect', function (done) {

  it('correctly implements 420 backoff', function (done) {
    var twit = new Twit(config1);

    var stream = twit.stream('statuses/filter', { track: [ 'fun', 'yolo']});

    var expectedInterval = 0;

    var numReconnectsTested = 0;
    var numReconnectsToTest = 3;

    stream.on('connected', function (res) {
      // simulate twitter closing the connection with 420 status
      res.statusCode = 420;
      stream.request.abort()

      // wait a bit before before checking if our connect interval got set
      setTimeout(function () {
        expectedInterval = expectedInterval ? 2*expectedInterval : 60000;

        // make sure our connect interval is correct
        assert.equal(stream.connectInterval, expectedInterval);
        console.log('420 rate limiting backoff:', stream.connectInterval);

        // simulate `scheduleReconnect` timer being called
        stream.keepAlive();
        delete stream.scheduledReconnect

        numReconnectsTested += 1;

        if (numReconnectsTested === numReconnectsToTest) {
          return done();
        }
      }, 100);
    });
  });
})