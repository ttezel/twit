//
//  Parser - for Twitter Streaming API
//
var util = require('util')
  , EventEmitter = require('events').EventEmitter;

var Parser = module.exports = function ()  {
  this.msgBuf = ''
  this.nextMsgBytes = 0
  this.lastByteChecked = 0

  EventEmitter.call(this);
};

util.inherits(Parser, EventEmitter);

Parser.prototype.parse = function (chunk) {
  // message var represents anything left in local buffer plus new chunk
  var message = this.msgBuf += chunk;

  // do we have a known piece incoming?
  if (this.nextMsgBytes > 0) {
    if (message.length >= this.nextMsgBytes) { // we have what we need to process

      // separate active head piece of message from remainder
      var splitPos = this.nextMsgBytes;
      var piece = message.slice(0, splitPos);
      var rest  = message.slice(splitPos + 1);

      // process that piece
      this._processObj(piece);

      // reset state, then call ourselves recursively with remainder of message
      this.nextMsgBytes = 0;    // since we just processed it
      this.msgBuf = '';         // reset state
      this.lastByteChecked = 0; // reset state
      this.parse(rest);

    } else { // we are still expecting more data
      this.msgBuf = message; // store what we have so far
      // after this, function will exit, until it gets called with next chunk..
    }

  } else { // we don't have any known pieces coming, so search for EOLs

    // parse until we find a full line
    // (be sure to indicate the last searched point to make search faster)
    var eolPos = message.indexOf('\r\n', this.lastByteChecked);
    if (eolPos !== -1) {
      // we have an EOL, take the first line for processing and reserve the rest
      var line = message.slice(0, eolPos);
      var rest = message.slice(eolPos + 2);

      // process that line
      this._processLine(line);

      // reset state, call ourselves recursively with remainder of message
      this.msgBuf = '';
      this.lastByteChecked = 0;
      this.parse(rest);

    } else {
      // we haven't found an EOL yet--indicate how far we have read so that we
      // don't recheck it on next chunk, and store in local buffer to it can be
      // resurrected when we get the next chunk.
      this.lastByteChecked = message.length - 1;
      this.msgBuf = message;
    }

  }
}

// a line can contain either a delimeted: length hint, or a JSON object
Parser.prototype._processLine = function (line) {
  // if entire line is an integer, assume we are getting delimited: length
  var hint = parseInt(line);
  if (!isNaN(hint)) {
    this.nextMsgBytes = hint;
  } else {
    this._processObj(line)
  }
}


// process what we assume should be a JSON object (but allow for errors..)
Parser.prototype._processObj = function (piece) {
  try {
    var msg = JSON.parse(piece)
  } catch (err) {
    this.emit('error', new Error('Error parsing twitter reply: `'+piece+'`, error message `'+err+'`'));
  } finally {
    if (msg) { this.emit('element', msg); }
  }
}
