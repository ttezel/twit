//
//  RTD2 - twitter Bot
//
//  listens on stdin for things to do, 
//  and broadcasts events to stdout
//
var config = require('../examples/config')
  , Bot = require('./bot').Bot;

var RTD2 = new Bot(config);

//
//  cli interface handlers
//
var Cli = {
  //  displays available commands
  help : function() {
    console.log('RTD2::Help\n'.cyan);
    console.log('Available commands:\n'.cyan);

    Object.keys(Cli).forEach(function(cmd) {
      console.log(cmd);
    })
    console.log('\n');
  },
  //  display today's tweets containing @phrase
  track: function(phrase) {
    if(!phrase) {
      console.log('\nRTD2::must enter tracking phrase'.cyan);
      return;
    }

    RTD2.track(phrase, function(err, reply) {
        if(err) console.log('error:', err);

        console.log('\n\nRTD2::Tracking results:'.cyan);

        //  display barebones metadata for each tweet result
        var tweets = JSON.parse(reply).results
          , num = tweets.length;

        if(!num) { 
          console.log('no tweets for tracking phrase & date range'.red);
          return;
        }

        for(var i = 0; i < num; i++) {
          var tweet = tweets[i]
            , dateDisp = new Date(tweet.created_at).toTimeString()
            , userDisp = '@' + tweet.from_user + ':';

          //  highlight substrings that match tracking phrase
          var regex = new RegExp(phrase, 'gi')
            , tweetDisp = tweet.text.replace(regex, phrase.yellow);

          console.log(dateDisp.bold + '  ' + userDisp.cyan + ' ' + tweetDisp + '\n');
        }
      });
  },
  tweet: function(status) {
    if(!status.length) {
      //  default:
      //  get today's most popular tweet concerning github,
      //  then tweet it
      RTD2.track('github.com/', function(err, reply) {
        if(err) console.log('error', err);
        
        var tweets = JSON.parse(reply).results
          , popular = RTD2.getPopular(tweets);

        if(!tweets.length) {
          console.log('no results for `github.com/` so far today'.red);
          return;
        }
        
        RTD2.tweet(popular, function(err, reply) {
            if(err) console.log('error:', err);

            console.log('RTD2::Tweeted:'.cyan, JSON.parse(reply).text);
        });
      });
    } else {  //  tweet @status
      RTD2.tweet(status, function(err, reply) {
        if(err) console.log(err);

        var text = JSON.parse(reply).text;
        console.log('RTD2::Tweeted: '.cyan, text)
      });
    }
  },
  mingle: function() {
    RTD2.mingle(function(err, reply) {
      if(err) console.log('error', err);

      var name = JSON.parse(reply).screen_name;
      console.log('RTD2::Mingle:'.cyan, 'followed ' + ('@' + name).bold.yellow);
    });  
  },
  prune: function() {
    RTD2.prune(function(err, reply) {
      if(err) console.log('error', err);

      var name = JSON.parse(reply).screen_name
      console.log('RTD2::Prune:'.cyan, 'unfollowed ' + ('@'+ name).bold.yellow);
    });
  }
};

//  CLI dispatcher
(function() {
  var args = process.argv
  , params = Array.prototype.slice.call(args, 3)
                                  .join(' ');

  switch(args[2]) {
    case 'help':
      Cli.help();
      break;
    case 'track':
      Cli.track(params);
      break;
    case 'tweet':
      Cli.tweet(params);
      break;
    case 'mingle':
      Cli.mingle();
      break;
    case 'prune':
      Cli.prune();
      break;
    default:
      console.log('\ncommand `' + args[2] + '` not supported.');
  } 
}).call(this);