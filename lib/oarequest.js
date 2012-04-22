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
};

//
//  Http request
//
var OARequest = function (oauth, method, path, params) {
  if(method !== 'GET' && method !== 'POST') {
    throw new Error('method `'+method+'` not supported.\n');
  }
  this.oauth = oauth;
  this.method = method;
  this.path = path + (params ? '?' + querystring.stringify(params) : '');
  
  EventEmitter.call(this);
};

util.inherits(OARequest, EventEmitter);

//
//  Perform http request & call @callback when reply is received
//
//  @persist    bool    keep connection alive?
//
OARequest.prototype.end = function (persist, callback) {
  if(!persist) {  //make request and pass parsed reply to @callback
    this.makeRequest(function(err, raw, response) {
      if(err) {
        err.twitterReply = raw;
        return callback(err, null); 
      }

      var parsed = null
        , error = null;

      try {
        parsed = JSON.parse(raw);
      } catch(e) {
        error = new Error('twitter reply is not a valid JSON string.');
        error.twitterReply = raw;
      } finally {
        return callback(error, parsed);
      }
    });
  } else {        //make request and pass eventemitter to @callback
    var self = this
      , parser = new Parser();

    parser
      .on('element', function (msg) {
        if      (msg['delete'])     { self.emit('delete', msg); }
        else if (msg['limit'])      { self.emit('limit', msg);  }     
        else if (msg['scrub_geo'])  { self.emit('scrub_geo', msg); }
        else                        { self.emit('tweet', msg); }
      })
      .on('error', function (err)   { self.emit('error', err); });

    function keepAlive () {
      var request = self.makeRequest(null); 
      request
          .on('response', function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) { parser.parse(chunk) });
          })
          .end();
      return request;
    }
    
    this.on('start', function () { self.request = keepAlive() });
    this.on('stop', function () { self.request.abort() });
    
    this.emit('start');
   
    return callback(this);
  }
};

OARequest.prototype.makeRequest = function (cb) {
  var action = this.method.toLowerCase();

  switch(action) {
    case 'get':
      return this.oauth.oa[action](
        this.path
      , this.oauth.config.access_token
      , this.oauth.config.access_token_secret
      , cb
    );
    break;
    case 'post':
      return this.oauth.oa.getProtectedResource(
          this.path
        , this.method
        , this.oauth.config.access_token
        , this.oauth.config.access_token_secret
        , cb
      );
      break;
    default:
      throw new Error('method'+this.method+'not supported') 
  }
};

module.exports = { OARequest: OARequest, Auth: Auth };