//
//  Create and execute http requests with OAuth authentication
//
var querystring = require('querystring')
  , oauth = require('oauth')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter;
 
var required = [
    'oauth_request_url'
  , 'oauth_access_url'
  , 'consumer_key'
  , 'consumer_secret'
  , 'access_token'
  , 'access_token_secret'
];
 
//
//  OAuth Request object
//
var OARequest = module.exports = function (config) {
  var self = this;
 
  EventEmitter.call(this);
 
  //check config for proper format
  if(typeof config !== 'object') {
    throw new TypeError('config must be object, got ' + typeof config);
  }
  var numreqs = required.length;
  for(var i = 0; i < numreqs; i++) {
    var requirement = required[i];
    if(!config[requirement]) {
      throw new Error('config must provide ' + requirement);
    } 
  }
  //assign config
  this.config = config;
  this.oa     = new oauth.OAuth(
      config.oauth_request_url
    , config.oauth_access_url
    , config.consumer_key
    , config.consumer_secret
    , '1.0'
    , null
    , 'HMAC-SHA1'
  );
  this.oa.getOAuthRequestToken(
    function(err){
      if(err) self.emit('error:', err);
      self.emit('ready');
  });
};
 
util.inherits(OARequest, EventEmitter);

OARequest.prototype.get = function(path) {
  this.path = path;
  this.method = 'GET';
  return this;
};

OARequest.prototype.post = function(path) {
  this.path = path;
  this.method = 'POST';
  return this;
};
 
//
//  Add query params to http request
//
OARequest.prototype.params = function (params) {
  this.args = '?' + querystring.stringify(params);
  return this;
};
 
//
//  Perform http request, call @callback when reply is received
//
OARequest.prototype.end = function (callback) {
  this.oa.getProtectedResource(
        this.path + (this.args || '')
      , this.method       
      , this.config.access_token
      , this.config.access_token_secret
      , callback
  );
};
 
//
//  Perform http request, persist the connection
//  Emit events:
//    data        when chunks are received in reply stream
//    end         when connection has closed
//
OARequest.prototype.persist = function () {
  var self = this;
   
  if(this.method === 'GET' || this.method === 'POST') {
    var action = this.method.toLowerCase()
      , req = this.oa[action](
            this.path + (this.args || '')
          , this.config.access_token
          , this.config.access_token_secret
        );
  } else {
    throw new Error('method `'+this.method+'` not supported.\n');
  }
 
  req
    .addListener('response', function (res) {
      res.setEncoding('utf8');
      res
        .addListener('data', function (chunk) {
          self.emit('data', chunk);
        })
        .addListener('end', function () {
          self.emit('end');
        });
    })
    .end();
 
  return this;
};