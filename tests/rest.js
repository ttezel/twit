var assert = require('assert')
  , EventEmitter = require('events').EventEmitter
  , fs = require('fs')
  , sinon = require('sinon')
  , Twit = require('../lib/twitter')
  , config1 = require('../config1')
  , config2 = require('../config2')
  , helpers = require('./helpers')
  , util = require('util')
  , async = require('async')

describe('REST API', function () {
  var twit = null

  before(function () {
    twit = new Twit(config1);
  })

  it('GET `account/verify_credentials`', function (done) {
    twit.get('account/verify_credentials', function (err, reply, response) {
      checkReply(err, reply)
      assert.notEqual(reply.followers_count, undefined)
      assert.notEqual(reply.friends_count, undefined)
      assert.ok(reply.id_str)

      checkResponse(response)

      assert(response.headers['x-rate-limit-limit'])
      done()
    })
  })

  it('GET `account/verify_credentials` using promise API only', function (done) {
    twit
      .get('account/verify_credentials', { skip_status: true })
      .catch(function (err) {
        console.log('catch err', err.stack)
      })
      .then(function (result) {
        checkReply(null, result.data)
        assert.notEqual(result.data.followers_count, undefined)
        assert.notEqual(result.data.friends_count, undefined)
        assert.ok(result.data.id_str)
        checkResponse(result.resp)
        assert(result.resp.headers['x-rate-limit-limit'])

        done()
      })
  })

  it('GET `account/verify_credentials` using promise API AND callback API', function (done) {
    var i = 0;

    var _checkDataAndResp = function (data, resp) {
      checkReply(null, data)
      assert.notEqual(data.followers_count, undefined)
      assert.notEqual(data.friends_count, undefined)
      assert.ok(data.id_str)
      checkResponse(resp)
      assert(resp.headers['x-rate-limit-limit'])

      i++;
      if (i == 2) {
        done()
      }
    }

    var get = twit.get('account/verify_credentials', function (err, data, resp) {
      assert(!err, err);
      _checkDataAndResp(data, resp);
    });
    get.catch(function (err) {
      console.log('Got error:', err.stack)
    });
    get.then(function (result) {
      _checkDataAndResp(result.data, result.resp);
    });
  })

  it('POST `account/update_profile`', function (done) {
    twit.post('account/update_profile', function (err, reply, response) {
      checkReply(err, reply)
      console.log('\nscreen name:', reply.screen_name)
      checkResponse(response)
      done()
    })
  })

  it('POST `statuses/update` and POST `statuses/destroy:id`', function (done) {
    var tweetId = null

    var params = {
      status: '@tolga_tezel tweeting using github.com/ttezel/twit. ' + helpers.generateRandomString(7)
    }
    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)
      console.log('\ntweeted:', reply.text)

      tweetId = reply.id_str
      assert(tweetId)
      checkResponse(response)

      var deleteParams = { id: tweetId }
      // Try up to 2 times to delete the tweet.
      // Even after a 200 response to statuses/update is returned, a delete might 404 so we retry.
      exports.req_with_retries(twit, 2, 'post', 'statuses/destroy/:id', deleteParams, [404], function (err, body, response) {
        checkReply(err, body)
        checkTweet(body)
        checkResponse(response)

        done()
      })
    })
  })

  it('POST `statuses/update` with characters requiring escaping', function (done) {
    var params = { status: '@tolga_tezel tweeting using github.com/ttezel/twit :) !' +  helpers.generateRandomString(15) }

    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)

      console.log('\ntweeted:', reply.text)

      checkResponse(response)

      var text = reply.text

      assert(reply.id_str)

      twit.post('statuses/destroy/:id', { id: reply.id_str }, function (err, reply, response) {
        checkReply(err, reply)
        checkTweet(reply)
        assert.equal(reply.text, text)

        checkResponse(response)

        done()
      })
    })
  })

  it('POST `statuses/update` with \'Hi!!\' works', function (done) {
    var params = { status: 'Hi!!' }

    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)

      console.log('\ntweeted:', reply.text)

      checkResponse(response)

      var text = reply.text

      var destroyRoute = 'statuses/destroy/'+reply.id_str

      twit.post(destroyRoute, function (err, reply, response) {
        checkReply(err, reply)
        checkTweet(reply)
        assert.equal(reply.text, text)

        checkResponse(response)

        done()
      })
    })
  })

  it('GET `statuses/home_timeline`', function (done) {
    twit.get('statuses/home_timeline', function (err, reply, response) {
      checkReply(err, reply)
      checkTweet(reply[0])

      checkResponse(response)

      done()
    })
  })

  it('GET `statuses/mentions_timeline`', function (done) {
    twit.get('statuses/mentions_timeline', function (err, reply, response) {
      checkReply(err, reply)
      checkTweet(reply[0])
      done()
    })
  })

  it('GET `statuses/user_timeline`', function (done) {
    var params = {
      screen_name: 'tolga_tezel'
    }

    twit.get('statuses/user_timeline', params, function (err, reply, response) {
      checkReply(err, reply)
      checkTweet(reply[0])

      checkResponse(response)

      done()
    })
  })

  it('GET `search/tweets` { q: "a", since_id: 12345 }', function (done) {
    var params = { q: 'a', since_id: 12345 }
    twit.get('search/tweets', params, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)
      checkTweet(reply.statuses[0])

      checkResponse(response)

      done()
    })
  })

  it('GET `search/tweets` { q: "fun since:2011-11-11" }', function (done) {
    var params = { q: 'fun since:2011-11-11', count: 100 }
    twit.get('search/tweets', params, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)
      checkTweet(reply.statuses[0])

      console.log('\nnumber of fun statuses:', reply.statuses.length)

      checkResponse(response)

      done()
    })
  })

  it('GET `search/tweets`, using `q` array', function (done) {
    var params = {
      q: [ 'banana', 'mango', 'peach' ]
    }

    twit.get('search/tweets', params, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)
      checkTweet(reply.statuses[0])

      checkResponse(response)

      done()
    })
  })

  it('GET `search/tweets` with count set to 100', function (done) {
    var params = {
      q: 'happy',
      count: 100
    }

    twit.get('search/tweets', params, function (err, reply, res) {
      checkReply(err, reply)
      console.log('\nnumber of tweets from search:', reply.statuses.length)
      // twitter won't always send back 100 tweets if we ask for 100,
      // but make sure it's close to 100
      assert(reply.statuses.length > 95)

      done()
    })
  })

  it('GET `search/tweets` with geocode', function (done) {
    var params = {
      q: 'apple', geocode: [ '37.781157', '-122.398720', '1mi' ]
    }

    twit.get('search/tweets', params, function (err, reply) {
      checkReply(err, reply)

      done()
    })
  })

  it('GET `direct_messages`', function (done) {
    twit.get('direct_messages', function (err, reply, response) {
      checkResponse(response)
      checkReply(err, reply)
      assert.ok(Array.isArray(reply))
      done()
    })
  })

  it('GET `followers/ids`', function (done) {
    twit.get('followers/ids', function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(Array.isArray(reply.ids))

      checkResponse(response)

      done()
    })
  })

  it('GET `followers/ids` of screen_name tolga_tezel', function (done) {
    twit.get('followers/ids', { screen_name: 'tolga_tezel' },  function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(Array.isArray(reply.ids))

      checkResponse(response)

      done()
    })
  })

  it('POST `statuses/retweet`', function (done) {
    // search for a tweet to retweet
    twit.get('search/tweets', { q: 'apple' }, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)

      var tweet = reply.statuses[0]
      checkTweet(tweet)

      var tweetId = tweet.id_str
      assert(tweetId)

      twit.post('statuses/retweet/'+tweetId, function (err, reply, response) {
        checkReply(err, reply)

        var retweetId = reply.id_str
        assert(retweetId)

        twit.post('statuses/destroy/'+retweetId, function (err, reply, response) {
          checkReply(err, reply)

          done()
        })
      })
    })
  })

  // 1.1.8 usage
  it('POST `statuses/retweet/:id` without `id` in params returns error', function (done) {
    twit.post('statuses/retweet/:id', function (err, reply, response) {
      assert(err)
      assert.equal(err.message, 'Twit: Params object is missing a required parameter for this request: `id`')
      done()
    })
  })

  // 1.1.8 usage
  it('POST `statuses/retweet/:id`', function (done) {
    // search for a tweet to retweet
    twit.get('search/tweets', { q: 'banana' }, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)

      var tweet = reply.statuses[0]
      checkTweet(tweet)

      var tweetId = tweet.id_str
      assert(tweetId)

      twit.post('statuses/retweet/:id', { id: tweetId }, function (err, reply) {
        checkReply(err, reply)

        var retweetId = reply.id_str
        assert(retweetId)

        twit.post('statuses/destroy/:id', { id: retweetId }, function (err, reply, response) {
          checkReply(err, reply)

          done()
        })
      })
    })
  })

  // 1.1.8 usage
  // skip for now since this API call is having problems on Twitter's side (404)
  it.skip('GET `users/suggestions/:slug`', function (done) {
    twit.get('users/suggestions/:slug', { slug: 'funny' }, function (err, reply, res) {
      checkReply(err, reply)
      assert.equal(reply.slug, 'funny')
      done()
    })
  })

  // 1.1.8 usage
  // skip for now since this API call is having problems on Twitter's side (404)
  it.skip('GET `users/suggestions/:slug/members`', function (done) {
    twit.get('users/suggestions/:slug/members', { slug: 'funny' }, function (err, reply, res) {
      checkReply(err, reply)

      assert(reply[0].id_str)
      assert(reply[0].screen_name)

      done()
    })
  })

  // 1.1.8 usage
  it('GET `geo/id/:place_id`', function (done) {
    var placeId = 'df51dec6f4ee2b2c'

    twit.get('geo/id/:place_id', { place_id: placeId }, function (err, reply, res) {
      checkReply(err, reply)

      assert(reply.country)
      assert(reply.bounding_box)
      assert.equal(reply.id, placeId)

      done()
    })
  })

  it('POST `direct_messages/new`', function (done) {
    var dmId

    async.series({
      postDm: function (next) {

        var dmParams = {
          screen_name: 'tolga_tezel',
          text: 'hey this is a direct message from twit! :) ' + helpers.generateRandomString(15)
        }
        // post a direct message from the sender's account
        twit.post('direct_messages/new', dmParams, function (err, reply) {
          assert(!err, err)
          assert(reply)

          dmId = reply.id_str

          exports.checkDm(reply)

          assert.equal(reply.text, dmParams.text)
          assert(dmId)

          return next()
        })
      },
      deleteDm: function (next) {
        twit.post('direct_messages/destroy', { id: dmId }, function (err, reply) {
          assert(!err, err)
          exports.checkDm(reply)
          assert.equal(reply.id, dmId)

          return next()
        })
      }
    }, done);
  })

  describe('Media Upload', function () {
    var twit = null

    before(function () {
      twit = new Twit(config1)
    })

    it('POST media/upload with png', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/cutebird.png', { encoding: 'base64' })

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert.equal(response.statusCode, 200)
        assert(!err, err)
        exports.checkMediaUpload(data)
        assert(data.image.image_type == 'image/png' || data.image.image_type == 'image\/png')
        done()
      })
    })

    it('POST media/upload with JPG', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/bigbird.jpg', { encoding: 'base64' })

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        assert.equal(data.image.image_type, 'image/jpeg')
        done()
      })
    })

    it('POST media/upload with static GIF', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/twitterbird.gif', { encoding: 'base64' })

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        assert.equal(data.image.image_type, 'image/gif')
        done()
      })
    })

    it('POST media/upload with animated GIF using `media_data` parameter', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/snoopy-animated.gif', { encoding: 'base64' })

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        var expected_image_types = ['image/gif', 'image/animatedgif']
        var image_type = data.image.image_type
        assert.ok(expected_image_types.indexOf(image_type) !== -1, 'got unexpected image type:' + image_type)
        done()
      })
    })

    it('POST media/upload with animated GIF, then POST a tweet referencing the media', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/snoopy-animated.gif', { encoding: 'base64' });

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        var expected_image_types = ['image/gif', 'image/animatedgif']
        var image_type = data.image.image_type
        assert.ok(expected_image_types.indexOf(image_type) !== -1, 'got unexpected image type:' + image_type)

        var mediaIdStr = data.media_id_string
        assert(mediaIdStr)
        var params = { status: '#nofilter', media_ids: [mediaIdStr] }
        twit.post('statuses/update', params, function (err, data, response) {
          assert(!err, err)
          var tweetIdStr = data.id_str
          assert(tweetIdStr)

          exports.req_with_retries(twit, 3, 'post', 'statuses/destroy/:id', { id: tweetIdStr }, [404], function (err, data, response) {
            checkReply(err, data)
            done()
          })
        })
      })
    })

    it('POST media/upload with animated GIF using `media` parameter', function (done) {
      var b64Content = fs.readFileSync(__dirname + '/img/snoopy-animated.gif', { encoding: 'base64' });

      twit.post('media/upload', { media: b64Content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        var expected_image_types = ['image/gif', 'image/animatedgif']
        var image_type = data.image.image_type
        assert.ok(expected_image_types.indexOf(image_type) !== -1, 'got unexpected image type:' + image_type)
        done()
      })
    })

    it('POST media/upload with JPG, then POST media/metadata/create with alt text', function (done) {
      var b64content = fs.readFileSync(__dirname + '/img/bigbird.jpg', { encoding: 'base64' })

      twit.post('media/upload', { media_data: b64content }, function (err, data, response) {
        assert(!err, err)
        exports.checkMediaUpload(data)
        assert.equal(data.image.image_type, 'image/jpeg')

        var mediaIdStr = data.media_id_string
        assert(mediaIdStr)
        var altText = 'a very small Big Bird'
        var params = { media_id: mediaIdStr, alt_text: { text: altText } }
        twit.post('media/metadata/create', params, function (err, data, response) {
          assert(!err, err)
          // data is empty on media/metadata/create success; nothing more to assert
          done();
        })
      })
    })
  })

  it('POST account/update_profile_image', function (done) {
    var b64content = fs.readFileSync(__dirname + '/img/snoopy-animated.gif', { encoding: 'base64' })

    twit.post('account/update_profile_image', { image: b64content }, function (err, data, response) {
      assert(!err, err);
      exports.checkReply(err, data);
      exports.checkUser(data);

      done()
    })
  })

  it('POST friendships/create', function (done) {
    var params = { screen_name: 'tolga_tezel', follow: false };
    twit.post('friendships/create', params, function (err, data, resp) {
      assert(!err, err);
      exports.checkReply(err, data);
      exports.checkUser(data);
      done();
    });
  })

  describe('Favorites', function () {
    it('POST favorites/create and POST favorites/destroy work', function (done) {
      twit.post('favorites/create', { id: '583531943624597504' }, function (err, data, resp) {
        assert(!err, err);
        exports.checkReply(err, data);
        var tweetIdStr = data.id_str;
        assert(tweetIdStr);

        twit.post('favorites/destroy', { id: tweetIdStr }, function (err, data, resp) {
          assert(!err, err);
          exports.checkReply(err, data);
          assert(data.id_str);
          assert(data.text);

          done();
        })
      })
    })
  })

  describe('error handling', function () {
    describe('handling errors from the twitter api', function () {
      it('should callback with an Error object with all the info and a response object', function (done) {
        var twit = new Twit({
          consumer_key: 'a',
          consumer_secret: 'b',
          access_token: 'c',
          access_token_secret: 'd'
        })
        twit.get('account/verify_credentials', function (err, reply, res) {
          assert(err instanceof Error)
          assert(err.statusCode === 401)
          assert(err.code > 0)
          assert(err.message.match(/token/))
          assert(err.twitterReply)
          assert(err.allErrors)
          assert(res)
          assert(res.headers)
          assert.equal(res.statusCode, 401)
          done()
        })
      })
    })
    describe('handling other errors', function () {
      it('should just forward errors raised by underlying request lib', function (done) {
        var twit = new Twit(config1);
        var fakeError = new Error('derp')

        var FakeRequest = function () {
          EventEmitter.call(this)
        }
        util.inherits(FakeRequest, EventEmitter)

        var stubGet = function () {
          var fakeRequest = new FakeRequest()
          process.nextTick(function () {
            fakeRequest.emit('error', fakeError)
          })
          return fakeRequest
        }

        var request = require('request')
        var stubGet = sinon.stub(request, 'get', stubGet)

        twit.get('account/verify_credentials', function (err, reply, res) {
          assert(err === fakeError)

          // restore request.get
          stubGet.restore()

          done()
        })
      })
    })

    describe('Request timeout', function () {
      it('set to 1ms should return with a timeout error', function (done) {
        config1.timeout_ms = 1;
        var twit = new Twit(config1);
        twit.get('account/verify_credentials', function (err, reply, res) {
          assert(err)
          assert.equal(err.message, 'ETIMEDOUT')
          delete config1.timeout_ms
          done()
        })
      })
    })
  });
});

describe('Twit agent_options config', function () {
  it('config.trusted_cert_fingerprints works against cert fingerprint for api.twitter.com:443', function (done) {
    // TODO: mock getPeerCertificate so we don't have to pin here
    config1.trusted_cert_fingerprints = [
      '24:EB:85:86:7A:98:71:85:E6:73:DF:0C:57:18:AE:50:2D:BA:0A:69'
    ];
    var t = new Twit(config1);

    t.get('account/verify_credentials', function (err, data, resp) {
      assert(!err, err)
      assert(data)
      assert(data.id_str)
      assert(data.name)
      assert(data.screen_name)

      delete config1.trusted_cert_fingerprints
      done();
    })
  })

  it('config.trusted_cert_fingerprints responds with Error when fingerprint mismatch occurs', function (done) {
    config1.trusted_cert_fingerprints = [
      'AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA:AA'
    ];
    var t = new Twit(config1);

    t.get('account/verify_credentials', function (err, data, resp) {
      assert(err)
      assert(err.toString().indexOf('Trusted fingerprints are: ' + config1.trusted_cert_fingerprints[0]) !== -1)

      delete config1.trusted_cert_fingerprints
      done();
    })
  })
})

describe('Local time offset compensation', function () {
  it('Compensates for local time being behind', function (done) {
    var t1 = Date.now();
    var t = new Twit(config2);

    var stubNow = function () {
      return 0;
    }
    var stubDateNow = sinon.stub(Date, 'now', stubNow);

    t.get('account/verify_credentials', function (err, data, resp) {
      assert(err);

      t.get('account/verify_credentials', function (err, data, resp) {
        assert(!err, err);
        exports.checkReply(err, data);
        exports.checkUser(data);
        assert(t._twitter_time_minus_local_time_ms > 0)

        stubDateNow.restore();

        done();
      })
    })
  })
})

/**
 * Basic validation to verify we have no error and reply is an object
 *
 * @param  {error} err   error object (or null)
 * @param  {object} reply reply object received from twitter
 */
var checkReply = exports.checkReply = function (err, reply) {
  assert.equal(err, null, 'reply err:'+util.inspect(err, true, 10, true))
  assert.equal(typeof reply, 'object')
}

/**
 * check the http response object and its headers
 * @param  {object} response  http response object
 */
var checkResponse = exports.checkResponse = function (response) {
  assert(response)
  assert(response.headers)
  assert.equal(response.statusCode, 200)
}

/**
 * validate that @tweet is a tweet object
 *
 * @param  {object} tweet `tweet` object received from twitter
 */
var checkTweet = exports.checkTweet = function (tweet) {
  assert.ok(tweet)
  assert.equal('string', typeof tweet.id_str, 'id_str wasnt string:'+tweet.id_str)
  assert.equal('string', typeof tweet.text)

  assert.ok(tweet.user)
  assert.equal('string', typeof tweet.user.id_str)
  assert.equal('string', typeof tweet.user.screen_name)
}

/**
 * Validate that @dm is a direct message object
 *
 * @param  {object} dm `direct message` object received from twitter
 */
exports.checkDm = function checkDm (dm) {
  assert.ok(dm)
  assert.equal('string', typeof dm.id_str)
  assert.equal('string', typeof dm.text)

  var recipient = dm.recipient

  assert.ok(recipient)
  assert.equal('string', typeof recipient.id_str)
  assert.equal('string', typeof recipient.screen_name)

  var sender = dm.sender

  assert.ok(sender)
  assert.equal('string', typeof sender.id_str)
  assert.equal('string', typeof sender.screen_name)

  assert.equal('string', typeof dm.text)
}

exports.checkMediaUpload = function checkMediaUpload (data) {
  assert.ok(data)
  assert.ok(data.image)
  assert.ok(data.image.w)
  assert.ok(data.image.h)
  assert.ok(data.media_id)
  assert.equal('string', typeof data.media_id_string)
  assert.ok(data.size)
}

exports.checkUser = function checkUser (data) {
  assert.ok(data)
  assert.ok(data.id_str)
  assert.ok(data.name)
  assert.ok(data.screen_name)
}

exports.assertTweetHasText = function (tweet, text) {
  assert(tweet.text.toLowerCase().indexOf(text) !== -1, 'expected to find '+text+' in text: '+tweet.text);
}

exports.req_with_retries = function (twit_instance, num_tries, verb, path, params, status_codes_to_retry, cb) {
  twit_instance[verb](path, params, function (err, data, response) {
    if (!num_tries || (status_codes_to_retry.indexOf(response.statusCode) === -1)) {
      return cb(err, data, response)
    }

    exports.req_with_retries(twit_instance, num_tries - 1, verb, path, params, status_codes_to_retry, cb)
  })
}
