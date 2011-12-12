#node-twitter

Twitter API wrapper for node.js

Supports both the **REST** and **Streaming** API's.

Gives you access to 4 Objects:

* **REST** -              Twitter's REST API. 
* **Stream.Public** -     Public stream (stream of public statuses)
* **Stream.User** -       User stream (of the authenticated user)
* **Stream.Site** -       Site stream (of the authenticated application)

You can GET and POST to:
* the REST endpoints (https://dev.twitter.com/docs/api)
* the public streaming endpoints (https://dev.twitter.com/docs/streaming-api/methods)
* user stream endpoints (https://dev.twitter.com/docs/streaming-api/user-streams) 
* site stream endpoints (https://dev.twitter.com/docs/streaming-api/site-streams)

Go here to create an app and get OAuth credentials (if you haven't already): https://dev.twitter.com/apps/new

##Usage:

```javascript
var Twitter = require('twitter');

var client = new Twitter({
    consumer_key:         '...'
  , consumer_secret:      '...'
  , access_token:         '...'
  , access_token_secret:  '...'
});

//
//  tweet 'hello world!' using the REST API
//
client
  .REST
  .post('statuses/update.json')
  .params({ status: 'hello world!' })
  .end(function(err, reply) {
    console.log('tweeted:', JSON.parse(reply).text);
  });

//
//  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
//
client
  .REST
  .get('search.json')
  .params({ q: 'banana', since: '2011-11-11' })
  .end(function(err, reply) {
    console.log(JSON.parse(reply));
  });
  
//
//  Filter the Twitter Streaming hose by the word 'mango'. 
//

var mangos = client
              .Stream
              .Public
              .get('statuses/filter.json')
              .params({ track: 'mango' })
              .persist();
  
mangos.on('tweet', function(data) {  //tweet message
  console.log('data', data);
})

mangos.on('delete', function(err) {  //status deletion message
  console.log('error:', err);
});

```

## License 

(The MIT License)

Copyright (c) by Tolga Tezel <tolgatezel11@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.