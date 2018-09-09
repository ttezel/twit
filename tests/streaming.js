var assert = require('assert')
  , http = require('http')
  , EventEmitter = require('events').EventEmitter
  , rewire = require('rewire')
  , sinon = require('sinon')
  , Twit = require('../lib/twitter')
  , config1 = require('../config1')
  , config2 = require('../config2')
  , colors = require('colors')
  , helpers = require('./helpers')
  , util = require('util')
  , zlib = require('zlib')
  , async = require('async')
  , restTest = require('./rest');

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
    stream.stop()
    assert.ok(tweet)
    assert.equal('string', typeof tweet.text)
    assert.equal('string', typeof tweet.id_str)

    console.log(('\ntweet: '+tweet.text).grey)

    done()
  });

  stream.on('reconnecting', function (req, res, connectInterval) {
    console.log('Got disconnected. Scheduling reconnect! statusCode:', res.statusCode, 'connectInterval', connectInterval)
  });

  stream.on('error', function (err) {
    console.log('Stream emitted an error', err)
    return done(err)
  })
}

/**
 * Check the stream state is correctly set for a stopped stream.
 *
 * @param  {object}   stream object returned by twit.stream()
 */
exports.checkStreamStopState = function (stream) {
  assert.strictEqual(stream._connectInterval, 0)
  assert.strictEqual(stream._usedFirstReconnect, false)
  assert.strictEqual(stream._scheduledReconnect, undefined)
  assert.strictEqual(stream._stallAbortTimeout, undefined)
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
      track: [ 'twitter', ':)', 'fun' ]
    }

    var stream = twit.stream('statuses/filter', params)

    exports.checkStream(stream, done)
  })

  it('statuses/filter using `track` and `language`', function (done) {
    var twit = new Twit(config1);
    var params = {
      track: [ 'twitter', '#apple', 'google', 'twitter', 'facebook', 'happy', 'party', ':)' ],
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
      stream.stop()

      exports.checkStreamStopState(stream)

      console.log('\nstopped stream')
    }, 2000)

    //after 3 seconds, start the stream, and stop after 'connect'
    setTimeout(function () {
      stream.once('connected', function (req) {
        console.log('\nrestarted stream')
        stream.stop()

        exports.checkStreamStopState(stream)

        console.log('\nstopped stream')
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

    it('user_stream `direct_message` event', function (done) {
      // User A follows User B
      // User A connects to their user stream
      // User B posts a DM to User A
      // User A receives it in their user stream
      this.timeout(0);

      // build out DM params
      function makeDmParams () {
        return {
          screen_name: receiverScreenName,
          text: helpers.generateRandomString(10) + ' direct message streaming event test! :-) ' + helpers.generateRandomString(20),
          twit_options: {
            retry: true
          }
        }
      }

      var dmIdsReceived = []
      var dmIdsSent = []
      var sentDmFound = false

      // start listening for user stream events
      var receiverStream = twitReceiver.stream('user')

      console.log('\nlistening for DMs')
      // listen for direct_message event and check DM once it's received
      receiverStream.on('direct_message', function (directMsg) {
        if (sentDmFound) {
          // don't call `done` more than once
          return
        }

        console.log('got DM event. id:', directMsg.direct_message.id_str)
        restTest.checkDm(directMsg.direct_message)
        dmIdsReceived.push(directMsg.direct_message.id_str)

        // make sure one of the DMs sent was found
        // (we can send multiple DMs if our stream has to reconnect)
        sentDmFound = dmIdsSent.some(function (dmId) {
          return dmId == directMsg.direct_message.id_str
        })

        if (!sentDmFound) {
          console.log('this DM doesnt match our test DMs - still waiting for a matching one.')
          console.log('dmIdsSent', dmIdsSent)
          return
        }

        receiverStream.stop()
        return done()
      })

      var lastTimeSent = 0
      var msToWait = 0
      var postDmInterval = null

      receiverStream.on('connected', function () {
        var dmParams = makeDmParams()

        console.log('sending a new DM:', dmParams.text)
        twitSender.post('direct_messages/new', dmParams, function (err, reply) {
          assert(!err, err)
          assert(reply)
          restTest.checkDm(reply)
          assert(reply.id_str)
          // we will check this dm against the reply recieved in the message event
          dmIdsSent.push(reply.id_str)

          console.log('successfully posted DM:', reply.text, reply.id_str)
          if (dmIdsReceived.indexOf(reply.id_str) !== -1) {
            // our response to the DM posting lost the race against the direct_message
            // listener (we already got the event). So we can finish the test.
            done()
          }
        })
      })

      after(function (done) {
        console.log('cleaning up DMs:', dmIdsSent)
        // delete the DMs we posted
        var deleteDms = dmIdsSent.map(function (dmId) {
          return function (next) {
            assert.equal(typeof dmId, 'string')
            console.log('\ndeleting DM', dmId)
            var params = { id: dmId, twit_options: { retry: true } }
            twitSender.post('direct_messages/destroy', params, function (err, reply) {
              assert(!err, err)
              restTest.checkDm(reply)
              assert.equal(reply.id, dmId)
              return next()
            })
          }
        })
        async.parallel(deleteDms, done)
      })
    })
})

describe('streaming API friends preamble', function () {
  it('returns an array of strings if stringify_friend_ids is true', function (done) {
    var twit = new Twit(config1);
    var stream = twit.stream('user', { stringify_friend_ids: true });
    stream.on('friends', function (friendsObj) {
      assert(friendsObj)
      assert(friendsObj.friends_str)
      if (friendsObj.friends_str.length) {
        assert.equal(typeof friendsObj.friends_str[0], 'string')
      } else {
        console.log('\nEmpty friends preamble:', friendsObj, '. Make some friends on Twitter! ^_^')
      }
      done()
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
      assert.equal(err.statusCode, 401)
      assert(err.twitterReply)

      return done()
    })
  })
})

describe('streaming API `messages` event', function (done) {
  var request = require('request');
  var originalPost = request.post;
  var RewiredTwit = rewire('../lib/twitter');
  var RewiredStreamingApiConnection = rewire('../lib/streaming-api-connection');
  var revertParser, revertTwit;

  var MockParser = function () {
    var self = this;
    EventEmitter.call(self);
    process.nextTick(function () {
      self.emit('element', {scrub_geo: 'bar'})
      self.emit('element', {limit: 'buzz'})
    });
  }
  util.inherits(MockParser, EventEmitter);

  before(function () {
    revertTwit = RewiredTwit.__set__('StreamingAPIConnection', RewiredStreamingApiConnection);
    revertParser = RewiredStreamingApiConnection.__set__('Parser', MockParser);

    request.post = function () { return new helpers.FakeRequest() }
  })

  after(function () {
    request.post = originalPost;
    revertTwit();
    revertParser();
  })

  it('is returned for 2 different event types', function (done) {
    var twit = new RewiredTwit(config1);
    var stream = twit.stream('statuses/sample');
    var gotScrubGeo = false;
    var gotLimit = false;
    var numMessages = 0;

    var maybeDone = function () {
      if (gotScrubGeo && gotLimit && numMessages == 2) {
        done()
      }
    }

    stream.on('limit', function () {
      gotLimit = true;
      maybeDone();
    });
    stream.on('scrub_geo', function () {
      gotScrubGeo = true;
      maybeDone();
    })

    stream.on('message', function (msg) {
      numMessages++;
      maybeDone();
    })
  })
})

describe('streaming reconnect', function (done) {
  it('correctly implements connection closing backoff', function (done) {
    var stubPost = function () {
      var fakeRequest = new helpers.FakeRequest()
      process.nextTick(function () {
        fakeRequest.emit('close')
      })
      return fakeRequest
    }

    var request = require('request')
    var stubPost = sinon.stub(request, 'post', stubPost)

    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter', { track: [ 'fun', 'yolo']});

    var reconnects = [0, 250, 500, 750]
    var reconnectCount = -1

    var testDone = false

    stream.on('reconnect', function () {
      if (testDone) {
        return
      }
      reconnectCount += 1
      var expectedInterval = reconnects[reconnectCount]

      // make sure our connect interval is correct
      assert.equal(stream._connectInterval, expectedInterval);

      // simulate immediate reconnect by forcing a new connection (`self._connectInterval` parameter unchanged)
      stream._startPersistentConnection();

      if (reconnectCount === reconnects.length -1) {
        // restore request.post
        stubPost.restore()
        testDone = true
        return done();
      }
    });
  });

  it('correctly implements 420 backoff', function (done) {
    var stubPost = function () {
      var fakeRequest = new helpers.FakeRequest()
      process.nextTick(function () {
        var fakeResponse = new helpers.FakeResponse(420)
        fakeRequest.emit('response', fakeResponse)
        fakeRequest.emit('close')
      })
      return fakeRequest
    }

    var request = require('request')
    var stubPost = sinon.stub(request, 'post', stubPost)

    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter', { track: [ 'fun', 'yolo']});

    var reconnects = [60000, 120000, 240000, 480000]
    var reconnectCount = -1
    var testComplete = false

    stream.on('reconnect', function (req, res, connectInterval) {
      if (testComplete) {
        // prevent race between last connection attempt firing a reconnect and us validating the final
        // reconnect value in `reconnects`
        return
      }

      reconnectCount += 1
       var expectedInterval = reconnects[reconnectCount]

      // make sure our connect interval is correct
      assert.equal(stream._connectInterval, connectInterval);
      assert.equal(stream._connectInterval, expectedInterval);
      // simulate immediate reconnect by forcing a new connection (`self._connectInterval` parameter unchanged)
      stream._startPersistentConnection();

      if (reconnectCount === reconnects.length -1) {
        // restore request.post
        stubPost.restore()
        testComplete = true
        return done();
      }
    });
  });
});

describe('Streaming API disconnect message', function (done) {
  it.skip('results in stopping the stream', function (done) {
    var stubPost = function () {
      var fakeRequest = new helpers.FakeRequest()
      process.nextTick(function () {
        var body = zlib.gzipSync(JSON.stringify({disconnect: true}) + '\r\n')
        var fakeResponse = new helpers.FakeResponse(200, body)
        fakeRequest.emit('response', fakeResponse);
        fakeResponse.emit('close')
      });
      return fakeRequest
    }

    var request = require('request')
    var origRequest = request.post
    var stubs = sinon.collection
    stubs.stub(request, 'post', stubPost)

    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter', { track: ['fun']});

    stream.on('disconnect', function (disconnMsg) {
      stream.stop();
      // restore stub
      request.post = origRequest
      done();
    })
  })
});

describe.skip('Streaming API Connection limit exceeded message', function (done) {
  it('results in an `error` event containing the message', function (done) {
    var errMsg = 'Exceeded connection limit for user';

    var stubPost = function () {
      var fakeRequest = new helpers.FakeRequest();
      process.nextTick(function () {
        var body = zlib.gzipSync(errMsg + '\r\n');
        var fakeResponse = new helpers.FakeResponse(200, body);
        fakeRequest.emit('response', fakeResponse);
        fakeResponse.emit('close');
      });
      return fakeRequest
    }

    var request = require('request');
    var origRequest = request.post;
    var stubs = sinon.collection;
    stubs.stub(request, 'post', stubPost);

    var twit = new Twit(config1);
    var stream = twit.stream('statuses/filter');

    stream.on('error', function (err) {
      assert(err.toString().indexOf(errMsg) !== -1, 'Unexpected error msg:' + errMsg + '.');;
      stream.stop();
      // restore stub
      request.post = origRequest;
      done();
    })
  })
})

describe('Streaming API connection management', function () {
  it('.stop() works in all states', function (done) {
    var stubPost = function () {
      var fakeRequest = new helpers.FakeRequest();
      process.nextTick(function () {
        var body = zlib.gzipSync('Foobar\r\n');
        var fakeResponse = new helpers.FakeResponse(200, body);
        fakeRequest.emit('response', fakeResponse);
      });
      return fakeRequest
    }

    var request = require('request');
    var origRequest = request.post;
    var stubs = sinon.collection;
    stubs.stub(request, 'post', stubPost);

    var twit = new Twit(config1);

    var stream = twit.stream('statuses/sample');
    stream.stop();
    console.log('\nStopped. Restarting..');
    stream.start();
    stream.once('connect', function(request) {
      console.log('Stream emitted `connect`. Stopping & starting stream..')
      stream.stop();

      stream.once('connected', function () {
        console.log('Stream emitted `connected`. Stopping stream.');
        stream.stop();

        stubs.restore();
        done();
      });
      stream.start();
    });
  })
})
