var vows = require('vows')
  , assert = require('assert')
  , Twitter = require('../lib/twitter')
  , config = require('../examples/config');

var rest = new Twitter(config).REST;

//
//  REST API tests
//
vows.describe('REST API')
    .addBatch({
      'when calling GET statuses/public_timeline.json': {
        topic: function () {
         rest
           .get('statuses/public_timeline.json')
           .end(this.callback);
        }, 
        'no error thrown & reply is object': checkReply()
      },
      'when calling GET search.json?q=grape&since_id=12345': {
        topic: function () {
          rest
            .get('search.json')
            .params({ q: 'grape' , since_id: 12345 })
            .end(this.callback);
        },
        'no error thrown & reply is object' : checkReply()
      },
      'when calling GET followers/ids.json': {
        topic: function () {
          rest
            .get('followers/ids.json')
            .end(this.callback);
        },
        'no error thrown & reply is object' : checkReply()
      }
    })
    .export(module);

function checkReply () {
  return function (err, reply) {
    assert.isNull(err);
    assert.isTrue(typeof reply === 'object' || typeof reply === 'array');
  };
};