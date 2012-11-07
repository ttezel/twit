//
//  Twitter API Wrapper
//
var Auth = require('./auth')
  , OARequest = require('./oarequest')
 
//  Endpoints
var REST_ROOT     = 'https://api.twitter.com/1.1/'
  , PUB_STREAM    = 'https://stream.twitter.com/1.1/'
  , USER_STREAM   = 'https://userstream.twitter.com/1.1/'
  , SITE_STREAM   = 'https://sitestream.twitter.com/1.1/'
  , OA_REQ        = 'https://api.twitter.com/oauth/request_token'
  , OA_ACCESS     = 'https://api.twitter.com/oauth/access_token'

var STREAM_ENDPOINT_MAP = {
  user: USER_STREAM,
  site: SITE_STREAM
}
  
//
//  Twitter
//
var Twitter = function (config) {  
  var credentials = {
      oauth_request_url   : OA_REQ
    , oauth_access_url    : OA_ACCESS
    , consumer_key        : config.consumer_key
    , consumer_secret     : config.consumer_secret
    , access_token        : config.access_token
    , access_token_secret : config.access_token_secret
  }

  //authenticate our oauth client
  this.auth = new Auth(credentials)
}

Twitter.prototype = {
  get: function (path, params, callback) {
    this.request('GET', REST_ROOT + path, params, callback)
  },
  post: function (path, params, callback) {
    this.request('POST', REST_ROOT + path, params, callback)
  },
  request: function (method, path, params, callback) {
    if (typeof params === 'function') {
      callback = params
      params = null
    }

    return new OARequest(this.auth, method, path + '.json', this.normalizeParams(params)).end(callback)
  },
  stream: function (path, params) {
    var ROOT = STREAM_ENDPOINT_MAP[path] || PUB_STREAM
    var streamPath = ROOT + path + '.json'

    return new OARequest(this.auth, 'POST', streamPath, this.normalizeParams(params)).persist()
  },
  normalizeParams: function (params) {
    var normalized = params
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (key) {
        var value = params[key]
        if (Array.isArray(value))
          normalized[key] = value.join(',')
      })
    }
    return normalized
  }
}

module.exports = Twitter
