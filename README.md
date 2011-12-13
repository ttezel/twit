#twit

Twitter API wrapper for node

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
//  tweet 'hello world!' using the REST API
//
T.REST
 .post('statuses/update.json')
 .params({ status: 'hello world!' })
 .end(function(err, reply) {
    //  ...
  });
      
//
//  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
//
T.REST
 .get('search.json')
 .params({ q: 'banana', since: '2011-11-11' })
 .end(function(err, reply) {
    //  ...
  });
      
//
//  Filter the Twitter stream of public statuses by the word 'mango'. 
//

var mangos = T.publicStream
              .get('statuses/filter.json')
              .params({ track: 'mango' })
              .persist();
                    
                    
mangos.on('tweet', function(tweet) {
  //  ...
});

```

##GET and POST to:

* **REST** -              REST endpoints (https://dev.twitter.com/docs/api)
* **publicStream** -      public stream endpoints (https://dev.twitter.com/docs/streaming-api/methods)
* **userStream** -        user stream endpoints (https://dev.twitter.com/docs/streaming-api/user-streams) 
* **siteStream** -        site stream endpoints (https://dev.twitter.com/docs/streaming-api/site-streams)




Then, optionally pass in params to the request with `.params()`, and finish the request:


#Finishing the request

* `.end(function(err, reply) {})`      makes the http request and calls the (optional) callback when the reply is received. 
* `.persist()`                      keeps the connection alive and allows you to listen on the following 4 events:

    * `tweet`            status (tweet)
    * `delete`           status (tweet) deletion message
    * `limit`            limitation message 
    * `scrub_geo`        location deletion message


Hint: Use `.persist()` on the stream endpoints (`publicStream`, `userstream`, `siteStream`)

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