var vows = require('vows')
  , assert = require('assert')
  , EventEmitter = require('events').EventEmitter
  , Twit = require('../lib/twitter')
  , config = require('../examples/config');

//test cases
var cases = [
  { description: 'statuses/sample'
  , path: 'statuses/sample'
  , params: null
  },
  { description: 'statuses/filter'
  , path: 'statuses/filter'
  , params: {track: 'blue'}
  },
  { description: 'status/filter using location'
  , path: 'statuses/filter'
  , params: { locations:
      '-122.75,36.8,-121.75,37.8,-74,40,-73,41'
    }
  } 
];

var twit = new Twit(config)
  , tests = vows.describe('Streaming API');

cases.forEach(function(el) {
  var test = makeBatch(el.description, el.path, el.params);
  tests.addBatch(test);
});

tests.export(module);

//make vows batch with 1 context (we want serial)
function makeBatch(description, path, params) {
  var batch = {}; 
  batch[description] = {
    topic: function () {
      var promise = new EventEmitter();
      
      twit.stream(path, params, function(stream) {
        stream.on('tweet', function(tweet) {
                promise.emit('success', tweet);
                stream.emit('stop');
              })
              .on('error', function(err) {
                promise.emit('error', err);
                stream.emit('stop');
              });
      });
      return promise;
    }, 
    'no error and reply is object': function (err, reply) {
      assert.isNull(err);
      assert.isObject(reply);
    }
  };
  return batch;
};