var vows = require('vows')
  , assert = require('assert')
  , events = require('events')
  , Twit = require('../lib/twitter')
  , config = require('../examples/config');

var twitter = new Twit(config)
  , publicstream = twitter.publicStream
  , userstream = twitter.userStream;

vows.describe('Streaming API')
    .addBatch({
      'Public: statuses/filter.json?track=mango': {
        topic: function () {
          var mango = publicstream.get('statuses/filter.json')
                                  .params({ track: 'mango' })
                                  .persist();
          
          var promise = new(events.EventEmitter);

          listen(promise, mango);
          return promise;
        },
        'no error & reply is an object': check()
      },
      'User: user.json': {
        topic: function () {
          var ustream = userstream.get('user.json').persist()
            , promise = new (events.EventEmitter);

          listen(promise, ustream);
          return promise;                      
        },
        'no error & reply is an object': check()
      }
  })
  .export(module);

function check() {
  return function (err, reply) {
    assert.isNull(err);
    assert.isObject(reply);
  };
};

function listen (promise, stream) {
  stream
    .on('tweet',   function(chunk) {
      promise.emit('success', chunk) 
    })
    .on('error',  function(chunk) { 
      promise.emit('error', chunk) 
    });
};