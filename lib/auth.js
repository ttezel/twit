//
//  OAuth authentication class
//
var oauth = require('oauth')

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
function Auth (config) {
  //check config for proper format
  if (typeof config !== 'object')
    throw new TypeError('config must be object, got ' + typeof config)

  required.forEach(function (requirement) {
    if (!config[requirement])
      throw new Error('config must provide ' + requirement)
  })

  //assign config
  this.config = config
  this.oa     = new oauth.OAuth(
      config.oauth_request_url
    , config.oauth_access_url
    , config.consumer_key
    , config.consumer_secret
    , '1.0'
    , null
    , 'HMAC-SHA1'
  )
  var self = this;
  this.get  = function(path,cb) {
      return self.oa.get(
          path
          , self.config.access_token
          , self.config.access_token_secret
          , cb)
  }

  this.post = function(path,params,cb) {
      return self.oa.post(
          path
          , self.config.access_token
          , self.config.access_token_secret
          , params
          , cb
      )
  }

}

module.exports = Auth

