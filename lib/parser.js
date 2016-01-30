//
//  Parser - for Twitter Streaming API
//
var util = require('util')
  , EventEmitter = require('events').EventEmitter;

var Parser = module.exports = function ()  {
  this.message = ''

  EventEmitter.call(this);
};

util.inherits(Parser, EventEmitter);

Parser.prototype.parse = function (chunk) {
  this.message += chunk;
  chunk = this.message;

  var size = chunk.length
    , start = 0
    , offset = 0
    , curr
    , next;

  while (offset < size) {
    curr = chunk[offset];
    next = chunk[offset + 1];

    if (curr === '\r' && next === '\n') {
      var piece = chunk.slice(start, offset);
      start = offset += 2;

      if (!piece.length) { continue; } //empty object

      if (piece === 'Exceeded connection limit for user') {
        this.emit('connection-limit-exceeded',
                  new Error('Twitter says: ' + piece + '. Only instantiate one stream per set of credentials.'));
        continue;
      }

      try {
        var msg = JSON.parse(piece)
      } catch (err) {
        this.emit('error', new Error('Error parsing twitter reply: `'+piece+'`, error message `'+err+'`'));
      } finally {
        if (msg)
          this.emit('element', msg)

        continue
      }
    }
    offset++;
  }

  this.message = chunk.slice(start, size);
};
