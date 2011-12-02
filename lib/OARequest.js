//
//  Create and execute http requests with OAuth
//
var querystring = require('querystring')
  , oauth = require('oauth')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter;

//  Endpoints
var OAUTH_REQ     = 'https://api.twitter.com/oauth/request_token'
  , OAUTH_ACCESS  = 'https://api.twitter.com/oauth/access_token';

var required = [
    'consumer_key'
  , 'consumer_secret'
  , 'access_token'
  , 'access_token_secret'
];

//
//  OAuth Request object
//
OARequest = function (config, method, path) {
  var self = this;

  EventEmitter.call(this);
  
  //check config for proper format
  if(typeof config !== 'object') {
    throw new Error('config must be object\n');
  }
  var numreqs = required.length;
  for(var i = 0; i < numreqs; i++) {
    var requirement = required[i];
    if(!config[requirement]) {
      throw new Error('config must provide ', requirement + '\n')
    }  
  }
  //assign configs
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
      if(err) self.emit('error', err);
      self.emit('ready');
  });
};

util.inherits(OARequest, EventEmitter);

module.exports = OARequest;

//
//  Add query params to http request
//
OARequest.prototype.params = function (params) {
  this.path += '?' + querystring.stringify(params);
  return this;
}

//
//  Send http request, calll @callback when reply is received
//
OARequest.prototype.end = function (callback) {
  this.oa.getProtectedResource(
        this.path
      , this.method        
      , this.config.access_token
      , this.config.access_token_secret
      , callback
  );
};

//
//  Persist the connection
//  Emit data events when chunks are received in reply stream
//
OARequest.prototype.persist = function () {
  var self = this
    , req;
  switch(this.method) {
    case 'GET':
      req = this.oa.get(
          this.path
        , this.config.access_token
        , this.config.access_token_secret
      );
      break;
    case 'POST':
      req = this.oa.post(
          this.path
        , this.config.access_token
        , this.config.access_token_secret
      );
      break;
    default:
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