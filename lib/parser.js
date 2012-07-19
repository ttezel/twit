//
//  Parser - for Twitter Streaming API
//
var util = require('util')
  , EventEmitter = require('events').EventEmitter;

var Parser = module.exports = function()  { 
  EventEmitter.call(this);
};

util.inherits(Parser, EventEmitter);

/**
 * Rewritten parser
 * @param  {String} chunk Chunk from Request
 * @return {void}       
 */
Parser.prototype.parse = function(chunk) {
  var message = this.message += chunk;

  var newlineIndex = message.indexOf('\r');

  // response should not be sent until message includes '\r'.
  // Look at the section titled "Parsing Responses" in Twitter's documentation.
  if (newlineIndex !== -1) {
    var tweet = message.slice(0, newlineIndex);

    // we have the tweet
    try {
      var parsed = JSON.parse(tweet);
      this.emit('element', parsed);
    } catch(err) {
      this.emit('error', new Error('PARSER ERROR: ' + err));
    }
  }

  this.message = message.slice(newlineIndex + 1);
}

/**
 * Persistent message storage so we can build
 * up an array
 * @type {String}
 */
Parser.prototype.message = "";