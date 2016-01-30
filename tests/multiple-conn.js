var assert = require('assert');

var Twit = require('../lib/twitter');
var config1 = require('../config1');
var colors = require('colors');
var restTest = require('./rest.js');

/*
  Don't run these tests often otherwise Twitter will rate limit you
 */

describe.skip('multiple connections', function () {
  it('results in one of the streams closing', function (done) {
    var twit = new Twit(config1);

    var streams = [
      twit.stream('statuses/sample'),
      twit.stream('statuses/sample'),
      twit.stream('statuses/sample'),
    ];

    streams.forEach(function (stream, i) {
      stream.on('disconnect', function (disconnect) {
        console.log('Disconect for stream', i)
        assert.equal(typeof disconnect, 'object');
        assert.equal(stream.abortedBy, 'twit-client');
        done();
      });

      stream.on('error', function (errMsg) {
        console.log('error for stream', i, errMsg)
      })

      stream.on('tweet', function (t) {
        console.log(i)
      })

      stream.on('connected', function () {
        console.log('Stream', i, 'connected.')
      })
    });

  });
});

describe.skip('Managing multiple streams legally', function () {
  this.timeout(60000);
  it('updating track keywords without losing data', function (done) {
    var twit = new Twit(config1);
    var stream1 = twit.stream('statuses/filter', { track: ['#no'] });

    stream1.once('tweet', function (tweet) {
      console.log('got tweet from first stream')
      restTest.checkTweet(tweet);
      restTest.assertTweetHasText(tweet, '#no');

      // update our track list and initiate a new connection
      var stream2 = twit.stream('statuses/filter', { track: ['#fun'] });

      stream2.once('connected', function (res) {
        console.log('second stream connected')
        // stop the first stream immediately
        stream1.stop();
        assert.equal(res.statusCode, 200)

        stream2.once('tweet', function (tweet) {
          restTest.checkTweet(tweet);

          restTest.assertTweetHasText(tweet, '#fun');
          return done();
        })
      });
    });
  });
});
