//
//  Twitter API Wrapper
//
var OARequest = require('./OARequest');

//  Endpoints
var REST_ROOT     = 'https://api.twitter.com/1/'
  , STREAM_ROOT   = 'https://stream.twitter.com/1/'

//
//  Create OAuth-protected http request to a resource
//
var Resource = function (config, root) {
  this.config = config;
  this.root = root;
};

Resource.prototype = {
  get : function (path) {
    return new OARequest(this.config, 'GET', this.root + path);
  },
  post : function (path) {
    return new OARequest(this.config, 'POST', this.root + path);
  }
};

//
//  Twitter
//
var Twitter = function (config) {
  this.config = config;
  this.REST = new Resource(config, REST_ROOT);
  this.Stream = new Resource(config, STREAM_ROOT);
};

module.exports = Twitter;