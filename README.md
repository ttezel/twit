#twit

Twitter API Client for node

Supports both the **REST** and **Streaming** API.

##Usage:

```javascript
var Twit = require('twit');

var T = new Twit({
    consumer_key:         '...'
  , consumer_secret:      '...'
  , access_token:         '...'
  , access_token_secret:  '...'
});

//
//  tweet 'hello world!'
//
T.post('statuses/update', { status: 'hello world!' }, function(err, reply) {
  //  ...
});
      
//
//  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
//
T.get('search', { q: 'banana', since: '2011-11-11' }, function(err, reply) {
  //  ...
});
      
//
//  filter the twitter public stream by the word 'mango'. 
//

T.stream('statuses/filter', { track: 'mango' }, function (stream) {
  stream.on('tweet', function (tweet) {
    console.log(tweet);
  });
});

```

##

`T.get(path, [, params], callback)` and `T.post(path, [, params], callback)` are used to GET and POST to any of the REST API Endpoints.

Use `T.stream(path, [, params], callback)` with the Streaming API.

Note: You can omit the `.json` from `path`.

* If `path` is *'user'*, the User stream of the authenticated user will be streamed.
* If `path` is *'site'*, the Site stream of the authenticated application will be streamed.
* If `path` is anything other than *'user'* or *'site'*, the Public stream will be streamed.

##

* REST API Endpoints:       https://dev.twitter.com/docs/api
* Public stream endpoints:  https://dev.twitter.com/docs/streaming-api/methods
* User stream endpoints:    https://dev.twitter.com/docs/streaming-api/user-streams
* Site stream endpoints:    https://dev.twitter.com/docs/streaming-api/site-streams

# Using the Streaming API

When you do `T.stream()`, the connection is kept alive and allows you to listen on the following 4 events:

    * `tweet`            status (tweet)
    * `delete`           status (tweet) deletion message
    * `limit`            limitation message 
    * `scrub_geo`        location deletion message

#Installing

```
npm install twit

```


Go here to create an app and get OAuth credentials (if you haven't already): https://dev.twitter.com/apps/new

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