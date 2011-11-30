//
//  Twitter API Wrapper
//

var oauth = require('oauth');

var APIROOT       = 'https://api.twitter.com/1/'
  , OAUTH_REQ     = 'https://api.twitter.com/oauth/request_token'
  , OAUTH_ACCESS  = 'https://api.twitter.com/oauth/access_token'


//required configs
var configs = [
    'consumer_key'
  , 'consumer_secret'
  , 'access_token'
  , 'access_token_secret'
];

//
//  Twitter constructor
//
var Twitter = function (config) {
  var num = configs.length;

  for(var i = 0; i < num; i++) {
    var required = configs[i];

    if(!config[required]) {
      throw new Error('must provide ' + required);
    }
  }

  this.config   = config;
  this.oa       = new oauth.OAuth(
      OAUTH_REQ
    , OAUTH_ACCESS
    , this.config.consumer_key
    , this.config.consumer_secret
    , '1.0'
    , null
    , 'HMAC-SHA1'
  );

  this.oa.getOAuthRequestToken(
    function(err){
      if (err) { throw err; }
  });
};

//
//  make a twitter API request using OAuth
//
//  method defaults to GET
//
Twitter.prototype.oaRequest = function (method, url, callback) {
  this.oa.getProtectedResource(
      url
    , method || 'GET'         
    , this.config.access_token
    , this.config.access_token_secret
    , callback
  );
};

//
//  Make a Twitter API call
//
//  usage:
//
//  twitter.API('GET'
//            , 'followers/ids.json'
//            , { q: 'blue angels', until: '2011-11-11'}
//            , function(err, reply) {
//                console.log(reply);
//            });
//
Twitter.prototype.API = function (method, path, opts, callback) {
  this.oaRequest(method, APIROOT + path, function(err, reply) {
    if (err) { return callback(err); }

    return callback(null, reply);
  });
};

module.exports = {
  Twitter: Twitter
}