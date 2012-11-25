/*jslint node: true, indent: 4, maxlen: 80 */
/*properties
    EventEmitter, akku, call, emit, exports, inherits, length, parse, pop,
    prototype, split, tweetMsg
*/
var inherits = require('util').inherits,
    EventEmitter = require('events').EventEmitter;

/**
 * Parser - for Twitter Streaming API
 * @constructor
 * @augments EventEmitter
 */
var Parser = function () {
    "use strict";
    EventEmitter.call(this);
    /**
     * Used to store fragments of tweets between callbacks
     * @type {string}
     */
    this.akku = '';
};
inherits(Parser, EventEmitter);

/**
 * Rewritten parser
 * Emits event of the type "element" or "error" with an extended Error-object
 * When an error is emitted the original message is added to the Error-object as
 * .tweetMsg<br>
 * This function fixes the choped tweets.
 * This does not leak memory on some node.js versions as the original parser by
 * ttezel does when using the splice method.
 * @param  {String} chunk Chunk from the Twitter stream
 * @function
 * @version 2012-11-25 21:30:00UTC
 */
Parser.prototype.parse = function (chunk) {
    "use strict";
    // Store the incoming chunk into akku
    this.akku += chunk;
    var i, len, parsed,
        // Split akku into tweets.
        tweets = this.akku.split('\r\n');
    // Store the last element back into this.akku
    // It is either '', if we have one or more unfragmented tweets or it
    // contains the first half of a tweet
    this.akku = tweets.pop();
    // If at least one element remains in tweets, this is a twitter message
    // and we enter the for loop. I used a for loop, so the parser does not
    // break, if Twitter should decide to send more tweets at once.
    len = tweets.length;
    for (i = 0; i < len; i += 1) {
        // skip empty "keep alive message"
        if (tweets[i]) {
            // we have one or more messages to process
            try {
                parsed = JSON.parse(tweets[i]);
                this.emit('element', parsed);
            } catch (err) {
                err.tweetMsg = tweets[i];
                this.emit('error', err);
            }
        }
    }
};
module.exports = Parser;