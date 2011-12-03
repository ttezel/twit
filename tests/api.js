var vows = require('vows')
  , assert = require('assert')
  , events = require('events')
  , Twitter = require('../lib/twitter')
  , config = require('../examples/config');

//
//  REST API tests
//
vows.describe('REST API').addBatch({
  'when calling GET statuses/public_timeline.json': {
    topic: function () {
      var twitter = new Twitter(config);
      twitter.REST.get('statuses/public_timeline.json').end(this.callback);
    },
    'reply is a string': function (err, reply) {
      assert.isNull(err);
      assert.isString(reply);
    },
    'reply is a valid JSON string': function (err, reply) {
     assert.doesNotThrow(function () { JSON.parse(reply) }, Error);
    }
  }
}).export(module);
 
//
//  Streaming API tests
//
vows.describe('Streaming API').addBatch({
  'statuses/filter: when filter tracking term is `mango`': {
    topic: function () {
      var promise = new(events.EventEmitter);
     
      var twitter = new Twitter(config)
        , mango = twitter.Stream
                         .Public
                         .get('statuses/filter.json')
                         .params({ track: 'mango'})
                         .persist();
     
          mango.on('data',   function(chunk) { promise.emit('success', chunk) })
               .on('error',  function(chunk) { promise.emit('error', chunk) });
       
      return promise;
    },
    'reply is a string': function (chunk) {
      assert.isString(chunk);
    }
  }
}).export(module);

vows.describe('Streaming API: User Stream').addBatch({
  'user.json': {
    topic: function () {
      var promise = new(events.EventEmitter);
     
      var twitter = new Twitter(config)
        , mango = twitter.Stream
                         .User
                         .get('user.json')
                         .persist();
     
          mango.on('data',   function(chunk) { promise.emit('success', chunk) })
               .on('error',  function(chunk) { promise.emit('error', chunk) });
       
      return promise;
    },
    'reply is a string': function (chunk) {
      assert.isString(chunk);
    }
  }
}).export(module);