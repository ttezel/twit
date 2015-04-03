//
//  OAuth authentication class
//
var oauth = require('oauth')

var required = [
    'oauth_request_url'
  , 'oauth_access_url'
  , 'consumer_key'
  , 'consumer_secret'
];
//
var OAuth2Post = function (oa, url, access_token, callback, post_body) {
    var headers = {'Authorization': oa._buildAuthHeader(access_token)}
    oa._request("GET", url, headers, post_body, access_token, callback);

}

function AppOnlyAuth (config,access_token_ready_cb) {
  if (typeof config !== 'object')
    throw new TypeError('config must be object, got ' + typeof config)

  required.forEach(function (requirement) {
    if (!config[requirement])
      throw new Error('config must provide ' + requirement)
  })

  //assign config
  this.config = config
  this.oa = new oauth.OAuth2(config.consumer_key
      , config.consumer_secret
      , 'https://api.twitter.com/'
      , null
      , 'oauth2/token'
      , null);
  var that = this;

  this.refreshAccessToken = function (cb) {
    that.oa.getOAuthAccessToken(
        '',
        {'grant_type': 'client_credentials'},
        function (e, access_token, refresh_token, results) {
          cb(e, access_token);
        }
    );
  }

  this._setupRequestMethods = function(access_token) {
    that.get = function(path,cb) {
      return that.oa.get(
          path
          , access_token
          , cb)
    }
    that.post = function(path,params,cb) {
      return OAuth2Post(that.oa,path,access_token,cb,params);
    };
  }


  this._unsetupRequestMethods = function() {
    that.get = undefined;
    that.post = undefined;
  }

  this.refreshAccessToken(function(e, access_token) {
    that._setupRequestMethods(access_token);
    if (access_token_ready_cb) {
      access_token_ready_cb();
    }
  });



}

module.exports = AppOnlyAuth

