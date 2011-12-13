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
//  Make http Requests to an OAuth-protected resource
//
var Resource = function (auth, root) {
  this.auth = auth;
  this.root = root;
};

Resource.prototype = {
  get: function (path) {
    return new OARequest(this.auth, 'GET', this.root + path);
  },
  post: function (path) {
    return new OARequest(this.auth, 'POST', this.root + path);
  }
};
 
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

  this.REST         = new Resource(this.auth, REST_ROOT);
  this.publicStream = new Resource(this.auth, PUB_STREAM);
  this.userStream   = new Resource(this.auth, USER_STREAM);
  this.siteStream   = new Resource(this.auth, SITE_STREAM);
};

module.exports = Twitter;