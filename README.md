#twit

Twitter API Client for node

Supports both the **REST** and **Streaming** API.

#Installing

```
npm install twit

```

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
//  stream a sample of public statuses
//
T.stream('statuses/sample', function (stream) {
   stream.on('tweet', function (tweet) {
     console.log(tweet); 
   });
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

## twit API:

Just 3 methods. They cover the full twitter API.

* `T.get(path, [params], callback)`         GET any of the REST API Endpoints.
* `T.post(path, [params], callback)`        POST any of the REST API Endpoints.
* `T.stream(path, [params], callback)`      Use this with the Streaming API.

Note: Omit the `.json` from `path` (i.e. use `'statuses/sample'` instead of `'statuses/sample.json'`).

# Using the Streaming API

`T.stream()` keeps the connection alive and allows you to listen on the following 4 events:

* `tweet`            status (tweet)
* `delete`           status (tweet) deletion message
* `limit`            limitation message 
* `scrub_geo`        location deletion message

If you want to stop the stream, emit the 'stop' event: `stream.emit('stop')`.

To restart the stream, emit the 'start' event: `stream.emit('start')`.

###path


* If `path` is `'user'`, the User stream of the authenticated user will be streamed.
* If `path` is `'site'`, the Site stream of the authenticated application will be streamed.
* If `path` is anything other than `'user'` or `'site'`, the Public stream will be streamed.

#What do I have access to?

Anything in the Twitter API:

* REST API Endpoints:       https://dev.twitter.com/docs/api
* Public stream endpoints:  https://dev.twitter.com/docs/streaming-api/methods
* User stream endpoints:    https://dev.twitter.com/docs/streaming-api/user-streams
* Site stream endpoints:    https://dev.twitter.com/docs/streaming-api/site-streams

-------

Go here to create an app and get OAuth credentials (if you haven't already): https://dev.twitter.com/apps/new

--------

#How do I run the tests?

Install the dev dependencies ([mocha](https://github.com/visionmedia/mocha and [should](https://github.com/visionmedia/should.js)):

```
npm install mocha -g should
```

Note: When the `-g` flag is invoked, the package will be installed globally. In order to use `mocha` from the command line, you must use the `-g` flag.

Then run the tests:
```
mocha -t 10000 tests/*
```

-------

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