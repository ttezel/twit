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
//  @persist    bool      keep connection alive?
//  @callback   function  required for non-persistent requests
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

      var _res

      request
          .on('response', function (res) {
            _res = res
            res.setEncoding('utf8');
            res.on('data', function (chunk) { parser.parse(chunk) });
          })
          //tcp errors:
          //250ms , increment linearly til 16s
          //http errors:
          //5s, double til 320s
          //
          //back off linearly @ 250ms til 16s, then double til 320s
          .on('close', function () {
            if (!self.abortedBy || self.abortedBy === 'twit-client') return
            self.abortedBy = 'twitter'

            if (!self.connectInterval) {
              self.request = keepAlive()
              self.connectinterval = 0
              return
            }
            //rate limited - back off for a minute (danger of getting blocked by twitter)
            if (_res.statusCode === 420) self.connectInterval = 60000
            //double til 320s
            if (self.connectInverval >= 16000) self.connectInterval = 2*self.connectInterval
            else if (self.connectInterval <= 320000) self.connectInterval += 250

            setInterval(function () {
              self.request = keepAlive()
            }, self.connectInterval)
          })
          .on('error', function (err) {
            //don't need to do anything here; this gets called when the request is abort()'ed' 
          })
          .end();
      return request;
    }
    
    this.on('start', function () { self.request = keepAlive() });
    this.on('stop', function () { 
      self.abortedBy = 'twit-client'
      self.request.abort() 
    });
    
    this.emit('start'); //kick off the request
   
    return this
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