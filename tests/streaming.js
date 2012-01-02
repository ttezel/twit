var Twit = require('../lib/twitter')
  , config = require('../config')
  , should = require('should');

var twit = new Twit(config);

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
      '-122.75,36.8,121.75,37.8,-74,40,73,41'
    }
  },
  { description: 'stopping/restarting the stream'
  , custom: function () {
      it('stream should stop, restart, stop', function (done) {
        twit.stream('statuses/sample', function (stream) {
          stream.on('tweet', function (tweet) {
            tweet.should.be.a('object').and.have.property('text');
          });
          setTimeout(function () {
            stream.emit('stop');
            console.log('stop')
          }, 2000)
          setTimeout(function () {
            stream.emit('start')
            console.log('restart');
          }, 3000)
          setTimeout(function () {
            stream.emit('stop')
            console.log('stop')
            done();
          }, 4000)
        })
      })
    }
  } 
];

describe('Streaming API', function () {
  //  generate test cases
  //  if specified, use @custom test. Otherwise use @vanilla
  cases.forEach(function (test) {

    function vanilla () {
      it('should be an object', function (done) {
        twit.stream(test.path, test.params, function (stream) {
          stream.on('tweet', function (tweet) {
            process.nextTick(function () { stream.emit('stop') });
            tweet.should.be.a('object').and.have.property('text');
            done();
          })
        })
      })
    };

    describe(test.description, test.custom || vanilla);
  })
})