//
//  RTD2 - Twitter bot that tweets today's most popular github project
//
var config = require('./config')
  , Twitter = require('../lib/twitter').Twitter;

var randIndex = function (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
}

function datestring (d) {
  return d.getUTCFullYear()   + '-' 
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate();
}

var Bot = function(config, tracking) {
  this.twitter = new Twitter(config);
  this.tracking = tracking;
};

//
//  grab today's tweets containing the tracking term
//
Bot.prototype.track = function (callback) {
  var d = new Date(Date.now() - 5*60*60000)  //est timezone
      , dateString = datestring(d);   
    
  console.log('getting today\'s tweets filtered by `%s`', this.tracking);
  
  var params = {
      q : this.tracking
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
//  get the most popular tweet (by retweet count)
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
//  choose a random friend of one of your followers, and follow that user
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
Bot.prototype.prune = function (callback) {
  var self = this;
  
  this
    .twitter
    .get('followers/ids.json')
    .end(function(err, reply) {
      var followers = JSON.parse(reply).ids;
      
      self
        .twitter
        .get('friends/ids.json')
        .end(function(err, reply) {
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

var RTD2 = new Bot(config, 'github.com/');

//get today's most popular tweet containing the tracked term, and tweet it
RTD2.track(function(err, reply) {
  if(err) console.log('error', err);
  
  var tweets = JSON.parse(reply).results
    , popular = RTD2.getPopular(tweets);
  
  RTD2
    .twitter
    .post('statuses/update.json')
    .params({ status: popular })
    .end(function(err, reply) {
      if(err) console.log('error:', err);
      console.log('tweeted:', JSON.parse(reply).text);
    })
});

RTD2.mingle(function(err, reply) {
  if(err) console.log('error', err);
  console.log('mingle: followed @%s', JSON.parse(reply).screen_name);
});

RTD2.prune(function(err, reply) {
  if(err) console.log('error', err);
  console.log('prune: unfollowed @%s', JSON.parse(reply).screen_name);
});