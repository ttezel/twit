//
//  RTD2 - Twitter bot that tweets today's most popular github project
//
var config = require('../examples/config')
  , Bot = require('./bot').Bot

function datestring (d) {
  return d.getUTCFullYear()   + '-' 
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate();
}

var Rtd2 = function(config, tracking) {
  this.bot = new Bot(config);
  this.tracking = tracking;
};

//
//  grab today's tweets containing the tracking term
//
Rtd2.prototype.track = function (callback) {
  var self = this
      , d = new Date(Date.now() - 5*60*60000)  //est timezone
      , dateString = datestring(d);   
    
    console.log('getting today\'s tweets filtered by `%s`', this.tracking);     

    var path =  '/search.json?q='     + this.tracking +
                '%20since:'           + dateString    +
                '&result_type=mixed';

    this.bot.twitter.API('GET', path, {}, function(err, reply) {
      if(err) return callback(err);

      var tweets = JSON.parse(reply).results
        , popular = self.getPopular(tweets);

      return callback(null, tweets, popular);
    });
};

//
//  get the most popular tweet (by retweet count)
//
Rtd2.prototype.getPopular = function (tweets) {
  var i = tweets.length
    , max = 0
    , popular;

  while(i--) {
    var tweet = tweets[i]
      , popularity = tweet.metadata.recent_retweets;

    if(popularity > max) {
      max = popularity;
      popular = tweet.text;
    }
  }

  return popular;
};

//
//  Track tweets and tweet the most popular of them
//
Rtd2.prototype.run = function () {
  var self = this;

  this
};

var RTD2 = new Rtd2(config, 'github.com/');

RTD2.track(function(err, tweets, popular) {
  if (err) throw err;
  
  console.log('tweeting:', popular);

  var path = 'statuses/update.json?status=' + encodeURIComponent(popular);

  RTD2.bot.twitter.API('POST', path, {}, function(err, reply) {
    if(err) { console.log('error:', err); }
  });
});