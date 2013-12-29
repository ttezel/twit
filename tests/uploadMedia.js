var conf = {
        consumer_key: 'KIuDryUZ4WVj3JKm4Ke70w',
        consumer_secret: 'lSNlWEsWmId1lq7dAltDIPRAdfEqJSPZJtQ6FfhOAY',
        access_token: '18002455-1vZoBBoofmzMKocUTMY1xwp5sIzdkzzCxWKrJ3LRR',
        access_token_secret: 'gYiJv2FrG54c3EyF2UlvF5WIynnvsp5iUtee8xp6Wmxip'
     };
	 
var Twit = require('../');
var fs = require('fs');

var twit = new Twit(conf);

//twit.get('help/configuraion', function(a,b) {console.log(b)});
twit.updateWithMedia('prdel', fs.readFileSync('./small.jpg', 'base64'), console.log);
