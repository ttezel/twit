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
          console.log('getting first screen_name')
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
          console.log('getting second screen_name')
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
        console.log('making second user follow first one so first can DM')
        // make receiver (twit2) follow sender (twit)
        twit2.post('friendships/create', followParams, function (err, reply) {
          assert(!err, err)
          assert(reply.following)

          done()
        })
      })
    })

    it('direct_message event', function (done) {
      this.timeout(0);

      var makeDmParams =  function () {
        return {
          screen_name: receiverScreenName,
          text: 'direct message streaming event test! :-) ' + generateRandomString(10),
          twit_options: {
            retry: true
          }
        }
      }

      var dmId = null
      var dmsSent = []

      // start listening for user stream events
      var receiverStream = twit2.stream('user')

      receiverStream.on('reconnect', function (request, response, connectInterval) {
        console.log('stream reconnect: response status code', response.statusCode, 'connecting in', connectInterval)
      });

      console.log('\nlistening for DMs')
      // listen for direct_message event and check DM once it's received
      receiverStream.once('direct_message', function (directMsg) {
        console.log('got DM', directMsg.direct_message.text)
        restTest.checkDm(directMsg.direct_message)

        // make sure one of the DMs sent was found
        // (we can send multiple DMs if our stream has to reconnect)
        var sentDmFound = dmsSent.some(function (dm) {
          return (
            directMsg.direct_message.text === dm.text &&
            directMsg.direct_message.sender.screen_name === dm.sender.screen_name
          )
        })

        if (!sentDmFound) {
          console.log('this DM doesnt match our test DMs - still waiting for a matching one.')
        }

        if (sentDmFound) {
          receiverStream.stop()
          return done()
        }
      })

      receiverStream.on('connected', function () {
        var sendDm = function () {
          var dmParams = makeDmParams()

          twit.post('direct_messages/new', dmParams, function (err, reply) {
            assert(!err, err)
            assert(reply)
            restTest.checkDm(reply)

            // we will check this dm against the reply recieved in the message event
            dmsSent.push(reply)

            console.log('posted DM, dmId:', reply.text, reply.id_str)

            dmId = reply.id_str
            assert(dmId)
          })
        }

        if (dmId) {
          console.log('stream is connected again. deleting dmId', dmId)
          // if we already sent a DM it means we got disconnected and now the stream is reconnected.
          // Since we want to test listening on a DM event, destroy and recreate the
          // message now that we're connected and can listen for it.
          twit.post('direct_messages/destroy', { id: dmId }, function (err, reply) {

            if (!err || err.statusCode !== 404) {
              assert(!err, err)
              restTest.checkDm(reply)
              assert.equal(reply.id, dmId)
              console.log('deleted DM', dmId)
            }

            dmId = null

            sendDm()
          })
        } else {
          // first execution of `connected` handler - send the DM
          sendDm()
        }
      })

      after(function (done) {
        console.log('\ndeleting DM')
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