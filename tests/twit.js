var assert = require('assert')
  , Twit = require('../lib/twitter')
  , config1 = require('../config1')

describe('twit', function () {
  describe('instantiation', function () {
    it('works with var twit = new Twit()', function () {
      var twit = new Twit({
        consumer_key: 'a',
        consumer_secret: 'b',
        access_token: 'c',
        access_token_secret: 'd'
      });
      assert(twit.config)
      assert.equal(typeof twit.get, 'function')
      assert.equal(typeof twit.post, 'function')
      assert.equal(typeof twit.stream, 'function')
    })
    it('works with var twit = Twit()', function () {
      var twit = Twit({
        consumer_key: 'a',
        consumer_secret: 'b',
        access_token: 'c',
        access_token_secret: 'd'
      });
      assert(twit.config)
      assert.equal(typeof twit.get, 'function')
      assert.equal(typeof twit.post, 'function')
      assert.equal(typeof twit.stream, 'function')
    })
  })

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

    it('throws when config provides invalid strictSSL option', function (done) {
      assert.throws(function () {
        var twit = new Twit({
            consumer_key: 'a'
          , consumer_secret: 'a'
          , access_token: 'a'
          , access_token_secret: 'a'
          , strictSSL: 'a'
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
      twit.setAuth(config1)

      assert(twit.config.consumer_key === config1.consumer_key)
      assert(twit.config.consumer_secret === config1.consumer_secret)
      assert(twit.config.access_token === config1.access_token)
      assert(twit.config.access_token_secret === config1.access_token_secret)

      twit.get('account/verify_credentials', { twit_options: { retry: true } }, function (err, reply, response) {
        assert(!err, err);
        assert(response.headers['x-rate-limit-limit'])
        done()
      })
    })
  })
});
