var vows = require('vows')
  , assert = require('assert')
  , Twitter = require('../lib/twitter')
  , config = require('../examples/config');

var twit = new Twitter(config);

//
//  REST API tests
//
vows.describe('REST API')
    .addBatch({
      'calling GET statuses/public_timeline.json': {
        topic: function () {
         twit.get('statuses/public_timeline', this.callback);
        }, 
        'no error thrown & reply is object': checkReply
      },
      'calling GET search.json?q=grape&since_id=12345': {
        topic: function () {
          twit.get('search', { q: 'grape' , since_id: 12345 }, this.callback);
        },
        'no error thrown & reply is object' : checkReply
      },
      'calling GET followers/ids.json': {
        topic: function () {
          twit.get('followers/ids', this.callback);
        },
        'no error thrown & reply is object' : checkReply
      }
    })
    .export(module);

function checkReply (err, reply) {
  assert.isNull(err);
  assert.isTrue(typeof reply === 'object' || Array.isArray(reply));
};