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
T.get('search/tweets', { q: 'banana', since: '2011-11-11' }, function(err, reply) {
  //  ...
});

//
//  stream a sample of public statuses
//
var stream = T.stream('statuses/sample')

stream.on('tweet', function (tweet) {
  console.log(tweet); 
});
      
//
//  filter the twitter public stream by the word 'mango'. 
//
var stream = T.stream('statuses/filter', { track: 'mango' })

stream.on('tweet', function (tweet) {
  console.log(tweet);
});

```

# twit API:

Just 3 methods. They cover the full twitter API.

* `T.get(path, [params], callback)`         GET any of the REST API Endpoints.
* `T.post(path, [params], callback)`        POST any of the REST API Endpoints.
* `T.stream(path, [params])`                Use this with the Streaming API.

Note: Omit the `.json` from `path` (i.e. use `'statuses/sample'` instead of `'statuses/sample.json'`).

# Using the Streaming API

`T.stream()` keeps the connection alive, and returns an `EventEmitter`, which emits the following 4 events:

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


#How do I run the tests?

Clone the repo

```
git clone git@github.com:ttezel/twit.git
```

Install the dev dependencies ([mocha](https://github.com/visionmedia/mocha) and [should](https://github.com/visionmedia/should.js)):

```
npm install mocha -g should
```

Note: When the `-g` flag is invoked, the package will be installed globally. In order to use `mocha` from the command line, you must use the `-g` flag. This is necessary to run the tests with `npm test`.

Create a `config.js` file in the root of the cloned repo. It should export the oauth credentials. It should look something like this:

```
module.exports = {
    consumer_key: '...'
  , consumer_secret: '...'
  , access_token: '...'
  , access_token_secret: '...'
}
```

Then run the tests:

```
npm test
```

You can also run the example:

```
node examples/rtd2.js
```

![iRTD2](http://dl.dropbox.com/u/32773572/RTD2_logo.png)

The example is a twitter bot named [RTD2](https://twitter.com/#!/iRTD2) written using `twit`. RTD2 tweets about **github** and curates its social graph.

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

## Changelog

###0.2.0
  * Updated `twit` for usage with v1.1 of the Twitter API.

###0.1.5

  * **BREAKING CHANGE** to `twit.stream()`. Does not take a callback anymore. It returns 
    immediately with the `EventEmitter` that you can listen on. The `Usage` section in 
    the Readme.md has been updated. Read it.


###0.1.4

  * `twit.stream()` has signature `function (path, params, callback)`