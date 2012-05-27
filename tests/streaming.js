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
  , params: {track: 'apple'}
  },
  { description: 'statuses/filter using location'
  , path: 'statuses/filter'
  , params: { locations:
      '-122.75,36.8,121.75,37.8,-74,40,73,41'
    }
  },
  { description: 'stopping/restarting the stream'
  , custom: function () {
      var stream = twit.stream('statuses/sample')

      stream.on('tweet', function (tweet) {
        tweet.should.be.a('object').and.have.property('text');
      });
      setTimeout(function () {
        stream.emit('stop');
        console.log('\nstop')
      }, 2000)
      setTimeout(function () {
        stream.emit('start')
        console.log('restart');
      }, 3000)
      setTimeout(function () {
        stream.emit('stop')
        console.log('stop')
        caseNum++
        if (cases[caseNum]) runTest(cases[caseNum])
      }, 4000)
    }
  } 
];

var caseNum = 0

var curr = cases[0]

runTest(curr)

function runTest (testcase) {
  console.log(testcase.description)
  if (testcase.custom) {
    testcase.custom()
  } else {
    vanilla(testcase)
  }
}

function vanilla (test) {
  console.log('caseNum', caseNum)
  var stream = twit.stream(test.path, test.params)
  stream.on('tweet', function (tweet) {
    stream.emit('stop')
    tweet.should.be.a('object').and.have.property('text')
    caseNum++
    if (cases[caseNum]) runTest(cases[caseNum])
  })
}