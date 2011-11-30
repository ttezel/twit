#Twitter

Twitter API wrapper for node.js

##Usage:

```javascript
var Twitter = require('twitter').Twitter;

var client = new Twitter({
    consumer_key:         '...'
  , consumer_secret:      '...'
  , access_token:         '...'
  , access_token_secret:  '...'
});

//
//  tweet 'hello world!'
//
client
  .post('statuses/update.json')
  .params({ status: 'hello world!' })
  .end(function(err, reply) {
    console.log('tweeted:', JSON.parse(reply).text);
  });

//
//  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
//
client
  .get('search.json')
  .params({ q: 'banana', since: '2011-11-11' })
  .end(function(err, reply) {
    console.log(JSON.parse(reply));
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