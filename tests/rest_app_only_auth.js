var assert = require('assert')

var config1 = require('../config1');
var Twit = require('../lib/twitter');
var checkReply = require('./rest').checkReply;
var checkResponse = require('./rest').checkResponse;
var checkTweet = require('./rest').checkTweet;

describe('REST API using app-only auth', function () {
  var twit = null
  before(function () {
    var config = {
      consumer_key: config1.consumer_key,
      consumer_secret: config1.consumer_secret,
      app_only_auth: true,
    }
    twit = new Twit(config)
  })

  it('GET `application/rate_limit_status`', function (done) {
    twit.get('application/rate_limit_status', function (err, body, response) {
      checkReply(err, body)
      checkResponse(response)
      assert(body.rate_limit_context)
      done()
    })
  })

  it('GET `application/rate_limit_status with specific resource`', function (done) {
    var params = { resources: [ 'users', 'search' ]}
    twit.get('application/rate_limit_status', params, function (err, body, response) {
      checkReply(err, body)
      checkResponse(response)
      assert(body.rate_limit_context)
      assert(body.resources.users)
      assert(body.resources.search)
      assert.equal(Object.keys(body.resources).length, 2)
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
})

