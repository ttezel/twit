//
//  Bot
//  class for performing various twitter actions
//
var Twit = require('../lib/twitter')
  , colors = require('colors');

var randIndex = function (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};

function datestring (d) {
  return d.getUTCFullYear()   + '-' 
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate();
};

module.exports.Bot = Bot = function(config) {
  this.twit = new Twit(config);
};

//
//  grab today's tweets containing @phrase
//
//    raw reply is passed to @callback
//
Bot.prototype.track = function (phrase, callback) {
  var d = new Date(Date.now() - 5*60*60000)  //est timezone
      , dateString = datestring(d);   
  
  console.log(
      'BOT::Getting today\'s tweets filtered by `'.cyan 
    + phrase
    + '` since '.cyan
    + dateString
  );
  
  var params = {
      q : phrase
    , since: dateString
    , result_type: 'mixed'
  };
  
  this.twit.get('search', params, callback);
};

//
//  get the most popular tweet in @tweets (by retweet count)
//
//  @tweets       array       array of tweets
//
Bot.prototype.getPopular = function (tweets) {
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
//  post a tweet
//
//  raw reply is passed to @callback
//
Bot.prototype.tweet = function (status, callback) {
  if(typeof status !== 'string') {
    return callback(new Error('tweet must be of type String'));
  } else if(status.length > 140) {
    return callback(new Error('BOT::tweet is too long: '.green + status.length));
  }
  this.twit.post('statuses/update', { status: status }, callback);
};

//
//  choose a random friend of one of your followers, and follow that user
//
//  raw reply is passed to @callback
//
Bot.prototype.mingle = function (callback) {
  var self = this;
  
  this.twit.get('followers/ids', function(err, reply) {
      if(err) { return callback(err); }
      
      var followers = reply.ids
        , randFollower  = randIndex(followers);
        
      self.twit.get('friends/ids', { user_id: randFollower }, function(err, reply) {
          if(err) { return callback(err); }
          
          var friends = reply.ids
            , target  = randIndex(friends);
            
          self.twit.post('friendships/create', { id: target }, callback); 
        })
    })
};

//
//  prune your followers list ; unfollow a friend that hasn't followed you back
//
//  raw reply is passed to @callback
//
Bot.prototype.prune = function (callback) {
  var self = this;
  
  this.twit.get('followers/ids', function(err, reply) {
      if(err) return callback(err);
      
      var followers = reply.ids;
      
      self.twit.get('friends/ids', function(err, reply) {
          if(err) return callback(err);
          
          var friends = reply.ids
            , pruned = false;
          
          while(!pruned) {
            var target = randIndex(friends);
            
            if(!~followers.indexOf(target)) {
              pruned = true;
              self.twit.post('friendships/destroy', { id: target }, callback);   
            }
          }
      });
  });
};

Bot.prototype.stream = function (phrase) {
  this.twit.stream('statuses/filter', {track: phrase}, function(stream) {
    console.log('STREAM', stream)
    stream.on('tweet', function (tweet) { console.log(tweet.text); });
  });
};