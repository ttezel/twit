//
//  Twitter Bot
//
//  utility functions for a twitter bot
//
var Twitter = require('../lib/twitter').Twitter;  

var randIndex = function (array) {
  var index = Math.floor(array.length*Math.random());
  return array[index];
}

var Bot = function(configs) {
  this.twitter = new Twitter(configs);
};

//
//  make a new friend from users that your followers follow
//
Bot.prototype.mingle = function () {
  var self = this;

  //get followers & pick a random one
  this.twitter.API('GET', 'followers/ids.json', {}, function(err, reply) {
    if(err) { throw err; }

    var followers = JSON.parse(reply).ids;

    var randFollower  = randIndex(followers)
      , path          = 'friends/ids.json?user_id=' + randFollower

    //get friends of the random follower & pick one
    self.twitter.API('GET', path, {}, function(err, reply) {
      if(err) { throw err; }

      var friends = JSON.parse(reply).ids;

      var randFriend  = randIndex(friends)
        , path        = 'friendships/create.json?user_id=' + randFriend;

      //follow the chosen user
      self.twitter.API('POST', path, {}, function(err, reply) {
        if(err) { throw err; }

        console.log('mingle: followed @%s', JSON.parse(reply).screen_name);
      });
    })
  });
};

//
//  prune your followers list ; unfollow a friend that hasn't followed you back
//
Bot.prototype.prune = function () {
  //TODO
};

module.exports.Bot = Bot;