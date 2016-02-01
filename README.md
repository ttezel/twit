#twit

Twitter API Client for node

Supports both the **REST** and **Streaming** API.

#Installing

```
npm install twit
```

##Usage:

```javascript
var Twit = require('twit')

var T = new Twit({
  consumer_key:         '...',
  consumer_secret:      '...',
  access_token:         '...',
  access_token_secret:  '...',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

//
//  tweet 'hello world!'
//
T.post('statuses/update', { status: 'hello world!' }, function(err, data, response) {
  console.log(data)
})

//
//  search twitter for all tweets containing the word 'banana' since July 11, 2011
//
T.get('search/tweets', { q: 'banana since:2011-07-11', count: 100 }, function(err, data, response) {
  console.log(data)
})

//
//  get the list of user id's that follow @tolga_tezel
//
T.get('followers/ids', { screen_name: 'tolga_tezel' },  function (err, data, response) {
  console.log(data)
})

//
// Twit has promise support; you can use the callback API,
// promise API, or both at the same time.
//
T.get('account/verify_credentials', { skip_status: true })
  .catch(function (err) {
    console.log('caught error', err.stack)
  })
  .then(function (result) {
    // `result` is an Object with keys "data" and "resp".
    // `data` and `resp` are the same objects as the ones passed
    // to the callback.
    // See https://github.com/ttezel/twit#tgetpath-params-callback
    // for details.

    console.log('data', result.data);
  })

//
//  retweet a tweet with id '343360866131001345'
//
T.post('statuses/retweet/:id', { id: '343360866131001345' }, function (err, data, response) {
  console.log(data)
})

//
//  destroy a tweet with id '343360866131001345'
//
T.post('statuses/destroy/:id', { id: '343360866131001345' }, function (err, data, response) {
  console.log(data)
})

//
// get `funny` twitter users
//
T.get('users/suggestions/:slug', { slug: 'funny' }, function (err, data, response) {
  console.log(data)
})

//
// post a tweet with media
//
var b64content = fs.readFileSync('/path/to/img', { encoding: 'base64' })

// first we must post the media to Twitter
T.post('media/upload', { media_data: b64content }, function (err, data, response) {

  // now we can reference the media and post a tweet (media will attach to the tweet)
  var mediaIdStr = data.media_id_string
  var params = { status: 'loving life #nofilter', media_ids: [mediaIdStr] }

  T.post('statuses/update', params, function (err, data, response) {
    console.log(data)
  })
})

//
// post media via the chunked media upload API.
// You can then use POST statuses/update to post a tweet with the media attached as in the example above using `media_id_string`.
// Note: You can also do this yourself manually using T.post() calls if you want more fine-grained
// control over the streaming. Example: https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20
//
var filePath = '/absolute/path/to/file.mp4'
T.postMediaChunked({ file_path: filePath }, function (err, data, response) {
  console.log(data)
})

//
//  stream a sample of public statuses
//
var stream = T.stream('statuses/sample')

stream.on('tweet', function (tweet) {
  console.log(tweet)
})

//
//  filter the twitter public stream by the word 'mango'.
//
var stream = T.stream('statuses/filter', { track: 'mango' })

stream.on('tweet', function (tweet) {
  console.log(tweet)
})

//
// filter the public stream by the latitude/longitude bounded box of San Francisco
//
var sanFrancisco = [ '-122.75', '36.8', '-121.75', '37.8' ]

var stream = T.stream('statuses/filter', { locations: sanFrancisco })

stream.on('tweet', function (tweet) {
  console.log(tweet)
})

//
// filter the public stream by english tweets containing `#apple`
//
var stream = T.stream('statuses/filter', { track: '#apple', language: 'en' })

stream.on('tweet', function (tweet) {
  console.log(tweet)
})

```

# twit API:

##`var T = new Twit(config)`

Create a `Twit` instance that can be used to make requests to Twitter's APIs.

If authenticating with user context, `config` should be an object of the form:
```
{
    consumer_key:         '...'
  , consumer_secret:      '...'
  , access_token:         '...'
  , access_token_secret:  '...'
}
```

If authenticating with application context, `config` should be an object of the form:
```
{
    consumer_key:         '...'
  , consumer_secret:      '...'
  , app_only_auth:        true
}
```
Note that Application-only auth will not allow you to perform requests to API endpoints requiring
a user context, such as posting tweets. However, the endpoints available can have a higher rate limit.

##`T.get(path, [params], callback)`
GET any of the REST API endpoints.

**path**

The endpoint to hit. When specifying `path` values, omit the **'.json'** at the end (i.e. use **'search/tweets'** instead of **'search/tweets.json'**).

**params**

(Optional) parameters for the request.

**callback**

`function (err, data, response)`

- `data` is the parsed data received from Twitter.
- `response` is the [http.IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage) received from Twitter.

##`T.post(path, [params], callback)`

POST any of the REST API endpoints. Same usage as `T.get()`.

##`T.postMediaChunked(params, callback)`

Helper function to post media via the POST media/upload (chunked) API. `params` is an object containing a `file_path` key. `file_path` is the absolute path to the file you want to upload.

```js
var filePath = '/absolute/path/to/file.mp4'
T.postMediaChunked({ file_path: filePath }, function (err, data, response) {
  console.log(data)
})
```

You can also use the POST media/upload API via T.post() calls if you want more fine-grained control over the streaming; [see here for an example](https://github.com/ttezel/twit/blob/master/tests/rest_chunked_upload.js#L20).

##`T.getAuth()`
Get the client's authentication tokens.

##`T.setAuth(tokens)`
Update the client's authentication tokens.

##`T.stream(path, [params])`
Use this with the Streaming API.

**path**

Streaming endpoint to hit. One of:

- **'statuses/filter'**
- **'statuses/sample'**
- **'statuses/firehose'**
- **'user'**
- **'site'**

For a description of each Streaming endpoint, see the [Twitter API docs](https://dev.twitter.com/streaming/overview).

**params**

(Optional) parameters for the request. Any Arrays passed in `params` get converted to comma-separated strings, allowing you to do requests like:

```javascript
//
// I only want to see tweets about my favorite fruits
//

// same result as doing { track: 'bananas,oranges,strawberries' }
var stream = T.stream('statuses/filter', { track: ['bananas', 'oranges', 'strawberries'] })

stream.on('tweet', function (tweet) {
  //...
})
```

# Using the Streaming API

`T.stream(path, [params])` keeps the connection alive, and returns an `EventEmitter`.

The following events are emitted:

##event: 'message'

Emitted each time an object is received in the stream. This is a catch-all event that can be used to process any data received in the stream, rather than using the more specific events documented below.
New in version 2.1.0.

```javascript
stream.on('message', function (msg) {
  //...
})
```

##event: 'tweet'

Emitted each time a status (tweet) comes into the stream.

```javascript
stream.on('tweet', function (tweet) {
  //...
})
```

##event: 'delete'

Emitted each time a status (tweet) deletion message comes into the stream.

```javascript
stream.on('delete', function (deleteMessage) {
  //...
})
```

##event: 'limit'

Emitted each time a limitation message comes into the stream.

```javascript
stream.on('limit', function (limitMessage) {
  //...
})
```

##event: 'scrub_geo'

Emitted each time a location deletion message comes into the stream.

```javascript
stream.on('scrub_geo', function (scrubGeoMessage) {
  //...
})
```

##event: 'disconnect'

Emitted when a disconnect message comes from Twitter. This occurs if you have multiple streams connected to Twitter's API. Upon receiving a disconnect message from Twitter, `Twit` will close the connection and emit this event with the message details received from twitter.

```javascript
stream.on('disconnect', function (disconnectMessage) {
  //...
})
```

##event: 'connect'

Emitted when a connection attempt is made to Twitter. The http `request` object is emitted.

```javascript
stream.on('connect', function (request) {
  //...
})
```

##event: 'connected'

Emitted when the response is received from Twitter. The http `response` object is emitted.

```javascript
stream.on('connected', function (response) {
  //...
})
```

##event: 'reconnect'

Emitted when a reconnection attempt to Twitter is scheduled. If Twitter is having problems or we get rate limited, we schedule a reconnect according to Twitter's [reconnection guidelines](https://dev.twitter.com/streaming/overview/connecting). The last http `request` and `response` objects are emitted, along with the time (in milliseconds) left before the reconnect occurs.

```javascript
stream.on('reconnect', function (request, response, connectInterval) {
  //...
})
```

##event: 'warning'

This message is appropriate for clients using high-bandwidth connections, like the firehose. If your connection is falling behind, Twitter will queue messages for you, until your queue fills up, at which point they will disconnect you.

```javascript
stream.on('warning', function (warning) {
  //...
})
```

##event: 'status_withheld'

Emitted when Twitter sends back a `status_withheld` message in the stream. This means that a tweet was withheld in certain countries.

```javascript
stream.on('status_withheld', function (withheldMsg) {
  //...
})
```

##event: 'user_withheld'

Emitted when Twitter sends back a `user_withheld` message in the stream. This means that a Twitter user was withheld in certain countries.

```javascript
stream.on('user_withheld', function (withheldMsg) {
  //...
})
```

##event: 'friends'

Emitted when Twitter sends the ["friends" preamble](https://dev.twitter.com/streaming/overview/messages-types#user_stream_messsages) when connecting to a user stream. This message contains a list of the user's friends, represented as an array of user ids. If the [stringify_friend_ids](https://dev.twitter.com/streaming/overview/request-parameters#stringify_friend_id) parameter is set, the friends
list preamble will be returned as Strings (instead of Numbers).

```javascript
var stream = T.stream('user', { stringify_friend_ids: true })
stream.on('friends', function (friendsMsg) {
  //...
})
```

##event: 'direct_message'

Emitted when a direct message is sent to the user. Unfortunately, Twitter has not documented this event for user streams.

```javascript
stream.on('direct_message', function (directMsg) {
  //...
})
```

##event: 'user_event'

Emitted when Twitter sends back a [User stream event](https://dev.twitter.com/streaming/overview/messages-types#Events_event).
See the Twitter docs for more information on each event's structure.

```javascript
stream.on('user_event', function (eventMsg) {
  //...
})
```

In addition, the following user stream events are provided for you to listen on:

* `blocked`
* `unblocked`
* `favorite`
* `unfavorite`
* `follow`
* `unfollow`
* `user_update`
* `list_created`
* `list_destroyed`
* `list_updated`
* `list_member_added`
* `list_member_removed`
* `list_user_subscribed`
* `list_user_unsubscribed`
* `quoted_tweet`
* `retweeted_retweet`
* `favorited_retweet`
* `unknown_user_event` (for an event that doesn't match any of the above)

###Example:

```javascript
stream.on('favorite', function (event) {
  //...
})
```

##event: 'error'

Emitted when an API request or response error occurs.
An `Error` object is emitted, with properties:

```js
{
  message:      '...',  // error message
  statusCode:   '...',  // statusCode from Twitter
  code:         '...',  // error code from Twitter
  twitterReply: '...',  // raw response data from Twitter
  allErrors:    '...'   // array of errors returned from Twitter
}
```

##stream.stop()

Call this function on the stream to stop streaming (closes the connection with Twitter).

##stream.start()

Call this function to restart the stream after you called `.stop()` on it.
Note: there is no need to call `.start()` to begin streaming. `Twit.stream` calls `.start()` for you.

-------

#What do I have access to?

Anything in the Twitter API:

* REST API Endpoints:       https://dev.twitter.com/rest/public
* Public stream endpoints:  https://dev.twitter.com/streaming/public
* User stream endpoints:    https://dev.twitter.com/streaming/userstreams
* Site stream endpoints:    https://dev.twitter.com/streaming/sitestreams

-------

Go here to create an app and get OAuth credentials (if you haven't already): https://dev.twitter.com/apps/new

#Advanced

You may specify an array of trusted certificate fingerprints if you want to only trust a specific set of certificates.
When an HTTP response is received, it is verified that the certificate was signed, and the peer certificate's fingerprint must be one of the values you specified. By default, the node.js trusted "root" CAs will be used.

eg.
```js
var twit = new Twit({
  consumer_key:         '...',
  consumer_secret:      '...',
  access_token:         '...',
  access_token_secret:  '...',
  trusted_cert_fingerprints: [
    '66:EA:47:62:D9:B1:4F:1A:AE:89:5F:68:BA:6B:8E:BB:F8:1D:BF:8E',
  ]
})
```

#Contributing

- Make your changes
- Make sure your code matches the style of the code around it
- Add tests that cover your feature/bugfix
- Run tests
- Submit a pull request

#How do I run the tests?

Create two files: `config1.js` and `config2.js` at the root of the `twit` folder. They should contain two different sets of oauth credentials for twit to use (two accounts are needed for testing interactions). They should both look something like this:

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

[FAQ](https://github.com/ttezel/twit/wiki/FAQ)

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

###2.2.2
  * Emit `parser-error` instead of `error` event if Twitter sends back
  an uncompressed HTTP response body.

###2.2.1
  * Add promise support to Twit REST API calls.

###2.2.0
  * Allow omission of `new` keyword; `var t = Twit(config)` works, and `var t = new Twit(config)` works too.
  * Allow setting an array of trusted certificate fingerprints via `config.trusted_cert_fingerprints`.
  * Automatically adjust timestamp for OAuth'ed HTTP requests
  by recording the timestamp from Twitter HTTP responses, computing our local time offset, and applying the offset in the next HTTP request to Twitter.

###2.1.7
  * Add `mime` as a dependency.

###2.1.6
  * Emit `friends` event for `friends_str` message received when a user stream is requested with `stringify_friend_ids=true`.
  * Handle receiving "Exceeded connection limit for user" message from Twitter while streaming. Emit `error` event for this case.
  * Emit `retweeted_retweet` and `favorited_retweet` user events.
  * Add MIT license to package.json (about time!)

###2.1.5
  * Support config-based request timeout.

###2.1.4
  * Support POST media/upload (chunked) and add `T.postMediaChunked()` to make it easy.

###2.1.3
  * Fix bug in constructing HTTP requests for `account/update_profile_image` and `account/update_profile_background_image` paths.

###2.1.2
  * Enable gzip on network traffic
  * Add `quoted_tweet` event

###2.1.1
  * Strict-mode fixes (Twit can now be run with strict mode)
  * Fix handling of disconect message from Twitter
  * If Twitter returns a non-JSON-parseable fragment during streaming, emit 'parser-error' instead of 'error' (to discard fragments like "Internal Server Error")

###2.1.0
  * Add `message` event.

###2.0.0
  * Implement Application-only auth
  * Remove oauth module as a dependency

###1.1.20
  * Implement support for POST /media/upload
  * Reconnect logic fix for streaming; add stall abort/reconnect timeout on first connection attempt.

###1.1.14
  * Emit `connected` event upon receiving the response from twitter

###1.0.0
  * now to stop and start the stream, use `stream.stop()` and `stream.start()` instead of emitting the `start` and `stop` events
  * If twitter sends a `disconnect` message, closes the stream and emits `disconnect` with the disconnect message received from twitter

###0.2.0
  * Updated `twit` for usage with v1.1 of the Twitter API.

###0.1.5

  * **BREAKING CHANGE** to `twit.stream()`. Does not take a callback anymore. It returns
    immediately with the `EventEmitter` that you can listen on. The `Usage` section in
    the Readme.md has been updated. Read it.


###0.1.4

  * `twit.stream()` has signature `function (path, params, callback)`
