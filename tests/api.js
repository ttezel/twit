var Twitter = require('../lib/twitter')
  , config = require('../examples/config')


var twitter = new Twitter(config);

var bananahose = twitter.Stream.get('statuses/filter.json')
                        .params({ track: 'banana' })
                        .persist();

hose.on('data', function(data) {
  console.log('data', data);
})

hose.on('error', function(err) {
  console.log('error:', err);
});