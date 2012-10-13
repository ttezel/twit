var assert = require('assert')
  , Twit = require('../lib/twitter')

describe('twit config', function () {
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
