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
      
      try {
        var msg = JSON.parse(piece)

        this.emit('element', msg)
      } catch (err) {
        this.emit('error', new Error('Error parsing twitter reply: `'+piece+'`'));
      } finally {
        continue;
      }
    }
    offset++;
  }

  this.message = chunk.slice(start, size);
};