//
//  Twitter API Wrapper
//
var oarequest = require('./oarequest')
  , Auth = oarequest.Auth
  , OARequest = oarequest.OARequest;
 
//  Endpoints
var REST_ROOT     = 'https://api.twitter.com/1/'
  , PUB_STREAM    = 'https://stream.twitter.com/1/'
  , USER_STREAM   = 'https://userstream.twitter.com/2/'
  , SITE_STREAM   = 'https://sitestream.twitter.com/2b/'
  , OA_REQ        = 'https://api.twitter.com/oauth/request_token'
  , OA_ACCESS     = 'https://api.twitter.com/oauth/access_token';
  
//
//  Twitter
//
var Twitter = function (config) {  
  this.config = {
      oauth_request_url   : OA_REQ
    , oauth_access_url    : OA_ACCESS
    , consumer_key        : config.consumer_key
    , consumer_secret     : config.consumer_secret
    , access_token        : config.access_token
    , access_token_secret : config.access_token_secret
  };
  this.auth = new Auth(this.config);
};

Twitter.prototype = {
  get: function (path, params, callback) {
    this.request('GET', REST_ROOT + path, params, false, callback);
  },
  post: function (path, params, callback) {
    this.request('POST', REST_ROOT + path, params, false, callback);
  },
  stream: function (path, params) {
    var ROOT = '';
    switch(path) {
      case 'user':
        ROOT = USER_STREAM;
        break;
      case 'site':
        ROOT = SITE_STREAM;
        break;
      default:
        ROOT = PUB_STREAM;
        break;
    }
    return this.request('POST', ROOT + path, params, true);
  },
  request: function (method, path, params, persist, callback) {
    if(typeof params === 'function') {
      callback = params;
      params = null;
    }
    path += '.json';
    return new OARequest(this.auth, method, path, params).end(persist, callback);
  }
};

module.exports = Twitter;