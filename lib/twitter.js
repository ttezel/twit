//
//  Twitter API Wrapper
//
var oauth = require('oauth')
  , querystring = require('querystring');

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
};

Twitter.prototype.get = function (path) {
  return new this.Request(this.config, 'GET', path);
};

Twitter.prototype.post = function (path) {
  return new this.Request(this.config, 'POST', path);
};

//
//  Make a Twitter API request
//
Twitter.prototype.Request = function (config, method, path) {
  this.config = config;
  this.method = method;
  this.path   = path;
  this.oa     = new oauth.OAuth(
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
      if (err) { console.log('oauth error', err); }
  });
};

Twitter.prototype.Request.prototype = {
  oaRequest : function (method, url, callback) {
    this.oa.getProtectedResource(
        url
      , method        
      , this.config.access_token
      , this.config.access_token_secret
      , callback
    )
  },
  params : function (params) {
    this.params = params;
    return this;
  },
  end : function (callback) {
    var path = APIROOT + this.path + '?' + querystring.stringify(this.params);
    this.oaRequest(this.method, path, callback);
  }
};

module.exports.Twitter = Twitter;