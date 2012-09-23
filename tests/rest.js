var Twitter = require('../lib/twitter')
  , config = require('../config')
  , should = require('should')

var twit = new Twitter(config);

describe('REST API', function () {
  it('POST `account/update_profile`', function (done) {
    twit.post('account/update_profile', function (err, reply) {
      check(err, reply)
      console.log('screen name:', reply.screen_name)
      done()
    })
  })
  it('GET `statuses/home_timeline`', function (done) {
    twit.get('statuses/home_timeline', function (err, reply) {
      check(err, reply);
      done();
    });
  });
  it('GET `search/tweets` { q: "grape", since_id: 12345 }', function (done) {
    var params = { q: 'grape', since_id: 12345 };
    twit.get('search/tweets', params, function (err, reply) {
      check(err, reply);
      done();
    });
  });
  it('GET `followers/ids`', function (done) {
      twit.get('followers/ids', function (err, reply) {
        check(err, reply);
        done();
      });
  });
});

function check (err, reply) {
  should.not.exist(err);
  reply.should.be.a('object');
  (typeof reply === 'object' || Array.isArray(reply)).should.be.true;
};