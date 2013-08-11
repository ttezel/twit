var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config = require('../config')
  , util = require('util')

describe('REST API', function () {
  var twit = new Twit(config)

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

  it('POST `account/update_profile`', function (done) {
    twit.post('account/update_profile', function (err, reply, response) {
      checkReply(err, reply)
      console.log('\nscreen name:', reply.screen_name)
      checkResponse(response)
      done()
    })
  })

  var tweetId = null
    , text = null

  it('POST `statuses/update`', function (done) {
    var params = { status: '@tolga_tezel tweeting using github.com/ttezel/twit' }
    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)

      console.log('\ntweeted:', reply.text)
      console.log('tweeted on:', reply.created_at)

      tweetId = reply.id_str
      text = reply.text

      checkResponse(response)

      done()
    })
  })

  it('POST `statuses/destroy:id`', function (done) {
    var destroyRoute = 'statuses/destroy/'+tweetId

    twit.post(destroyRoute, function (err, reply, response) {
      checkReply(err, reply)
      checkTweet(reply)
      assert.equal(reply.text, text)

      checkResponse(response)

      done()
    })
  })

  it('POST `statuses/update` with characters requiring escaping', function (done) {
    var params = { status: '@tolga_tezel tweeting using github.com/ttezel/twit :) !' }

    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)

      console.log('\ntweeted:', reply.text)
      console.log('tweeted on:', reply.created_at)

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

  it('POST `statuses/update` with \'Hi!\' works', function (done) {
    var params = { status: 'Hi!' }

    twit.post('statuses/update', params, function (err, reply, response) {
      checkReply(err, reply)

      console.log('\ntweeted:', reply.text)
      console.log('tweeted on:', reply.created_at)

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

  it('GET `search/tweets` { q: "grape", since_id: 12345 }', function (done) {
    var params = { q: 'grape', since_id: 12345 }
    twit.get('search/tweets', params, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)
      checkTweet(reply.statuses[0])

      checkResponse(response)

      done()
    })
  })

  it('GET `search/tweets` { q: "banana since:2011-11-11" }', function (done) {
    var params = { q: 'banana since:2011-11-11', count: 100 }
    twit.get('search/tweets', params, function (err, reply, response) {
      checkReply(err, reply)
      assert.ok(reply.statuses)
      checkTweet(reply.statuses[0])

      console.log('\nnumber of banana statuses:', reply.statuses.length)

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
      checkReply(err, reply)
      assert.ok(Array.isArray(reply))
      checkDm(reply[0])

      checkResponse(response)

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
    twit.post('statuses/retweet/:id', { id: '343360866131001345' }, function (err, reply) {
      checkReply(err, reply)

      var retweetId = reply.id_str
      assert(retweetId)

      twit.post('statuses/destroy/:id', { id: retweetId }, function (err, reply, response) {
        checkReply(err, reply)

        done()
      })
    })
  })

  // 1.1.8 usage
  it('GET `users/suggestions/:slug`', function (done) {
    twit.get('users/suggestions/:slug', { slug: 'funny' }, function (err, reply, res) {
      checkReply(err, reply)
      assert.equal(reply.slug, 'funny')
      done()
    })
  })

  // 1.1.8 usage
  it('GET `users/suggestions/:slug/members`', function (done) {
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

  describe('error handling', function () {
    describe('handling errors from the twitter api', function () {
      it('should callback with an Error object with all the info', function (done) {
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
          assert(!reply)
          assert(!res)
          done()
        })
      })
    })
    describe('handling other errors', function () {
      it('should just forward them', function (done) {
        var twit = new Twit(config);

        var fakeError = new Error('derp')

        // stub the makeRequest function to throw a fake error
        var OARequest = require('../lib/oarequest')
        var orig = OARequest.prototype.makeRequest
        OARequest.prototype.makeRequest = function (cb) {
          cb(fakeError);
        }

        twit.get('account/verify_credentials', function (err, reply, res) {
          assert(err === fakeError)

          // restore stub
          OARequest.prototype.makeRequest = orig

          done()
        })
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
function checkReply (err, reply) {
  assert.equal(err, null, 'reply err:'+util.inspect(err, true, 10, true))
  assert.equal(typeof reply, 'object')
}

/**
 * check the http response object and its headers
 * @param  {object} response  http response object
 */
function checkResponse (response) {
  assert(response)
  assert(response.headers)
}

/**
 * validate that @tweet is a tweet object
 *
 * @param  {object} tweet `tweet` object received from twitter
 */
function checkTweet (tweet) {
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
function checkDm (dm) {
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
}
