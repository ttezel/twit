var Bot = require('./bot')
  , config = require('./config')
  , http = require('http');

  var util = require('util')
  
var bot = new Bot(config);

console.log('RTD2: Running.'.yellow);

http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.write('RTD2 is running..   8~)');
  run(res);
}).listen(13142);

//get date string for today's date (e.g. '2011-01-01')
function datestring () {
  var d = new Date(Date.now() - 5*60*60*1000);  //est timezone
  return d.getUTCFullYear()   + '-' 
     +  (d.getUTCMonth() + 1) + '-'
     +   d.getDate();
};

function run (res) {
  var rand = Math.random();
  
  if(rand <= 0.10) {      //  tweet popular github tweet
    var params = {
        q: 'github.com/'
      , since: datestring()
      , result_type: 'mixed'
    };
    this.twit.get('search', params, function (err, reply) {
      if(err) console.log('error:', err);
      
      var max = 0, popular;
      
      var tweets = reply.results
        , len = tweets.length;
      
      while(len--) {
        var tweet = tweets[i]
          , popularity = tweet.metadata.recent_retweets;
          
        if(popularity > max) {
          max = popularity;
          popular = tweet.text;
        }
      }
      
      this.tweet(popular, function (err, reply) {
        if(err) console.log('error:', err);
        
        res.write('Tweeted:'.cyan, reply.text);
      })
    });
  } else if(rand <= 0.50) { //  make a friend
    bot.mingle(function(err, reply) {
      if(err) console.log('error', err);

      var name = reply.screen_name;
      res.write('Mingle:'.cyan, 'followed ' + ('@' + name).bold.yellow);
    });
  } else {                  //  prune a friend
    bot.prune(function(err, reply) { 
      if(err) console.log('error', err);

      var name = reply.screen_name
      res.write('Prune:'.cyan, 'unfollowed ' + ('@'+ name).bold.yellow);
    });
  }
};