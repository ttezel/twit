var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config = require('../config')

describe('twit', function () {
  describe('config', function () {
    it('throws when passing empty config', function (done) {
      assert.throws(function () {
        var twit = new Twit({})
      }, Error)

      done()
    })

    it('throws when config is missing a required key', function (done) {
      assert.throws(function () {
        var twit = new Twit({
          consumer_key: 'a'
          , consumer_secret: 'a'
          , access_token: 'a'
        })
      }, Error)

      done()
    })

    it('throws when config provides all keys but they\'re empty strings', function (done) {
      assert.throws(function () {
        var twit = new Twit({
          consumer_key: ''
          , consumer_secret: ''
          , access_token: ''
          , access_token_secret: ''
        })
      }, Error)

      done()
    })
  })

  describe('setAuth()', function () {
    var twit;

    beforeEach(function () {
      twit = new Twit({
        consumer_key: 'a',
        consumer_secret: 'b',
        access_token: 'c',
        access_token_secret: 'd'
      })
    })

    it('should update the client\'s auth config', function (done) {
      // partial update
      twit.setAuth({
        consumer_key: 'x',
        consumer_secret: 'y'
      })

      assert(twit.config.consumer_key === 'x')
      assert(twit.config.consumer_secret === 'y')

      // full update
      twit.setAuth(config)

      assert(twit.config.consumer_key === config.consumer_key)
      assert(twit.config.consumer_secret === config.consumer_secret)
      assert(twit.config.access_token === config.access_token)
      assert(twit.config.access_token_secret === config.access_token_secret)

      twit.get('account/verify_credentials', function (err, reply, response) {
        assert(!err);
        assert(response.headers['x-rate-limit-limit'])
        done()
      })
    })

    it('should create a new auth object', function () {
      var oldAuth = twit.auth;

      twit.setAuth({
        consumer_key: 'a',
        consumer_secret: 'b'
      })

      assert(twit.auth && twit.auth !== oldAuth)
    })
  })
});