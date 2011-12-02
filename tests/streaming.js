/*
twitter.REST.get('search.json')
            .params({ q: 'Tolga' })
            .end(function(err, reply) {
              if(err) console.log(err);

              console.log('reply:', JSON.parse(reply));
            });
*/

var hose = twitter.Stream.get('statuses/filter.json')
                         .params({ track: 'banana' })
                         .persist();

hose.on('data', function(data) {
  console.log('data', data);
})

hose.on('error', function(err) {
  console.log('error:', err);
});