//
//  RTD2 - Twitter bot that tweets about the most popular github.com news
//  Also makes new friends and prunes its followings.
//
var Bot = require('./examples/bot.js'),
  config = process.env;

var bot = new Bot(config);

console.log('Engaging nitrous twitterous boost!');

//get date string for today's date (e.g. '2011-01-01')
function datestring () {
  var d = new Date(Date.now() - 5*60*60*1000);  //est timezone
  return d.getUTCFullYear() + '-' +
     (d.getUTCMonth() + 1) + '-' +
     d.getDate();
}

setInterval(function() {
  bot.twit.get('followers/ids', function(err, reply) {
    if(err) return handleError(err);
    console.log('\n# followers:' + reply.ids.length.toString());
  });
  var rand = Math.random();

  if(rand < 0.50) { //  make a friend
    bot.mingle(function(err, reply) {
      if(err) return handleError(err);

      var name = reply.screen_name;
      console.log('\nMingle: followed @' + name);
    });
  } else {                  //  prune a friend
    bot.prune(function(err, reply) {
      if(err) return handleError(err);

      var name = reply.screen_name;
      console.log('\nPrune: unfollowed @'+ name);
    });
  }
}, 80000);

function handleError(err) {
  console.error('response status:', err.statusCode);
  console.error('data:', err.data);
}
