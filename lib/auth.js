//
//  Twitter OAuth authentication class
//
var util = require('util')

var request = require('request')

var oauth = require('oauth')
var endpoints = require('./endpoints')

// values required for app-only auth
var required_for_app_auth = [
  'consumer_key',
  'consumer_secret'
];

// values required for user auth (superset of app-only auth)
var required_for_user_auth = required_for_app_auth.concat([
  'access_token',
  'access_token_secret'
]);

/**
 * Get a bearer token for OAuth2
 * @param  {String}   consumer_key
 * @param  {String}   consumer_secret
 * @param  {Function} cb
 */
exports.getBearerToken = function (consumer_key, consumer_secret, cb) {
  // use OAuth 2 for app-only auth (Twitter requires it)
  // get a bearer token using our app's credentials
  basic_auth_header = new Buffer(consumer_key + ':' + consumer_secret).toString('base64')
  req_opts = request.post({
    url: endpoints.API_HOST + '/oauth2/token',
    headers: {
      'Authorization': basic_auth_header,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: 'grant_type=client_credentials',
    json: true,
  }, function (err, res, body) {
    if (err) {
      return cb(err, body, res)
    }
    return cb(err, body['access_token'])
  })
}

//
//  Twitter OAuth Authentication Object
//
function Auth (config) {
  var self = this
  this._validate_or_throw(config)
  //assign config
  this.config = config

  var oauth_access_url = endpoints.OA_ACCESS
  var oauth_request_url = endpoints.OA_REQ

  // use OAuth 1.0 for user auth
  // From twitter API docs(https://dev.twitter.com/oauth/overview/authorizing-requests):
  // OAuth 1.0a is still required to issue requests on behalf of users.
  this.oa = new oauth.OAuth(
    oauth_request_url,
    oauth_access_url,
    config.consumer_key,
    config.consumer_secret,
    '1.0A',
    null,
    'HMAC-SHA1'
  )
}

//
// Check that the required auth credentials are present in `config`.
// @param {Object}  config  Object containing credentials for REST API auth
//
Auth.prototype._validate_or_throw = function (config) {
  //check config for proper format
  if (typeof config !== 'object') {
    throw new TypeError('config must be object, got ' + typeof config)
  }

  required_for_user_auth.forEach(function (req_key) {
    if (!config[req_key]) {
      var err_msg = util.format('config must provide %s for %s.', req_key, auth_type)
      throw new Error(err_msg)
    }
  })
}

module.exports = Auth

