//
//  Bot
//  class for performing various twitter actions
//
var Twitter = require('../lib/twitter').Twitter
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
  this.twitter = new Twitter(config);
};

//
//  grab today's tweets containing this.tracking
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
  
  this
    .twitter
    .get('search.json')
    .params(params)
    .end(callback);
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
  
  this
    .twitter
    .post('statuses/update.json')
    .params({ status: status })
    .end(callback);
};

//
//  choose a random friend of one of your followers, and follow that user
//
//  raw reply is passed to @callback
//
Bot.prototype.mingle = function (callback) {
  var self = this;
  
  this
    .twitter
    .get('followers/ids.json')
    .end(function(err, reply) {
      if(err) { return callback(err); }
      
      var followers = JSON.parse(reply).ids
        , randFollower  = randIndex(followers);
        
      self
        .twitter
        .get('friends/ids.json')
        .params({ user_id: randFollower })
        .end(function(err, reply) {
          if(err) { return callback(err); }
          
          var friends = JSON.parse(reply).ids
            , target  = randIndex(friends);
            
          self
            .twitter
            .post('friendships/create.json') 
            .params({ id: target })
            .end(callback); 
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
  
  this
    .twitter
    .get('followers/ids.json')
    .end(function(err, reply) {
      if(err) return callback(err);
      
      var followers = JSON.parse(reply).ids;
      
      self
        .twitter
        .get('friends/ids.json')
        .end(function(err, reply) {
          if(err) return callback(err);
          
          var friends = JSON.parse(reply).ids
            , target = randIndex(friends)
            , pruned = false;
          
          while(!pruned) {
            if(!~followers.indexOf(target)) {
              pruned = true;
              
              self
                .twitter
                .post('friendships/destroy.json')
                .params({ id: target })
                .end(callback);   
            }
          }
      });
  });
};