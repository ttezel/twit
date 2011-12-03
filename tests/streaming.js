var vows = require('vows')
  , assert = require('assert')
  , events = require('events')
  , Twitter = require('../lib/twitter')
  , config = require('../examples/config');

var stream = new Twitter(config).Stream;

vows.describe('Streaming API')
    .addBatch({
      'Public: statuses/filter.json?track=mango': {
        topic: function () {
          var mango = stream
                        .Public
                        .get('statuses/filter.json')
                        .params({ track: 'mango' })
                        .persist();
          
          var promise = new(events.EventEmitter);

          listen(promise, mango);
          return promise;
        },
        'no error & reply is string': check()
      },
      'User: user.json': {
        topic: function () {
          var ustream = stream
                          .User
                          .get('user.json')
                          .persist();

          var promise = new (events.EventEmitter);

          listen(promise, ustream);
          return promise;                      
        },
        'no error & reply is a string': check()
      }
  })
  .export(module);

function check() {
  return function (err, reply) {
    assert.isNull(err);
    assert.isString(reply);
  };
};

function listen (promise, stream) {
  stream
    .on('data',   function(chunk) { 
          promise.emit('success', chunk) 
    })
    .on('error',  function(chunk) { 
      promise.emit('error', chunk) 
    });
};