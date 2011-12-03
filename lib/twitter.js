//
//  Twitter API Wrapper
//
var OARequest = require('./OARequest');
 
//  Endpoints
var REST_ROOT     = 'https://api.twitter.com/1/'
  , STREAM_ROOT   = 'https://stream.twitter.com/1/'
  , STREAM_USER   = 'https://userstream.twitter.com/2/'
  , STREAM_SITE   = 'https://sitestream.twitter.com/2b/';
 
//
//  Make http requests to an OAuth-protected resource
//
var Resource = function (oarequest, root) {
  this.oarequest = oarequest;
  this.root = root;
};

Resource.prototype = {
  get: function (path) {
    return this.oarequest.get(this.root + path);
  },
  post: function (path) {
    return this.oarequest.post(this.root + path);
  }
};
 
//
//  Twitter
//
var Twitter = function (config) {
  this.config = config;
  this.oarequest = new OARequest(config);
  this.REST = new Resource(this.oarequest, REST_ROOT);
  this.Stream = {
      Public: new Resource(this.oarequest, STREAM_ROOT)
    , User:   new Resource(this.oarequest, STREAM_USER)
    , Site:   new Resource(this.oarequest, STREAM_SITE)  
  };
};

module.exports = Twitter;