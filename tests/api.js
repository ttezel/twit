var Twitter = require('../lib/twitter')
  , config = require('../examples/config')


var twitter = new Twitter(config);

var hose = twitter.Stream.get('statuses/filter.json')
                        .params({ track: 'banana' })
                        .persist();

hose.on('data', function(data) {
  try {
    var tweets = JSON.parse(data);
    console.log(tweets);
  } catch (err) {
    console.log('non-parsed data:', data); 
  }
});

hose.on('error', function(err) {
  console.log('error:', err);
});