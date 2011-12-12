//
//  Create and execute Http requests to an Oauth-protected resource
//
var oauth = require('oauth')
  , querystring = require('querystring')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter
  , Parser = require('./parser');
 
var required = [
    'oauth_request_url'
  , 'oauth_access_url'
  , 'consumer_key'
  , 'consumer_secret'
  , 'access_token'
  , 'access_token_secret'
];
 
//
//  OAuth Authentication Object
//
var Auth = function (config) {
  var self = this;
 
  EventEmitter.call(this);
 
  //check config for proper format
  if(typeof config !== 'object') {
    throw new TypeError('config must be object, got ' + typeof config);
  }
  for(var i = 0, numreqs = required.length; i < numreqs; i++) {
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
 
util.inherits(Auth, EventEmitter);

//
//  Http request
//
var OARequest = function (oauth, method, path) {
  if(method !== 'GET' && method !== 'POST') {
    throw new Error('method `'+method+'` not supported.\n');
  }
  this.oauth = oauth;
  this.method = method;
  this.path = path;
  this.args = '';
  
  EventEmitter.call(this);
};

util.inherits(OARequest, EventEmitter);

//
//  Add query params to http request
//
OARequest.prototype.params = function (params) {
  this.args = '?' + querystring.stringify(params);
  return this;
};

//
//  Perform http request & call @callback when reply is received
//
OARequest.prototype.end = function (callback) {
  var action = this.method.toLowerCase();
  this.oauth.oa.getProtectedResource(
      this.path + this.args
    , this.method
    , this.oauth.config.access_token
    , this.oauth.config.access_token_secret
    , callback
  )
};
 
//
//  Perform http request & persist the connection
//  Emit events:
//    delete, limit, scrub_geo, tweet
//
//  Listen on events:
//    stop      aborts the request (to start again, call persist())
//
OARequest.prototype.persist = function () {
  var self = this;
  
  this.parser = new Parser(); 
  this.parser
      .on('element', function (msg) {
        if      (msg['delete'])     { self.emit('delete', msg); }
        else if (msg['limit'])      { self.emit('limit', msg);  }     
        else if (msg['scrub_geo'])  { self.emit('scrub_geo', msg); }
        else                        { self.emit('tweet', msg); }
      })
      .on('error', function (err) {
        self.emit('error', err);
      });
      
  var action = this.method.toLowerCase();
  this.request = this.oauth.oa[action](
      this.path + this.args
    , this.oauth.config.access_token
    , this.oauth.config.access_token_secret
  );
  
  this.request
      .on('response', function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) { self.parser.parse(chunk) });
      })
      .end();
      
  this.on('stop', function () { self.request.abort() });
 
  return this;
};

module.exports = { OARequest: OARequest, Auth: Auth };