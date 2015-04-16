//
//  Twitter API Wrapper
//
var Auth = require('./auth')
  , OARequest = require('./oarequest')
    , AppOnlyAuth = require('./app_only_auth')

//  Endpoints
var REST_ROOT     = 'https://api.twitter.com/1.1/'
  , PUB_STREAM    = 'https://stream.twitter.com/1.1/'
  , USER_STREAM   = 'https://userstream.twitter.com/1.1/'
  , SITE_STREAM   = 'https://sitestream.twitter.com/1.1/'
  , MEDIA_UPLOAD  = 'https://upload.twitter.com/1.1/'
  , OA_REQ        = 'https://api.twitter.com/oauth/request_token'
  , OA_ACCESS     = 'https://api.twitter.com/oauth/access_token'

//
//  Twitter
//
var Twitter = function (config,access_token_ready_cb) {
  var credentials = {
      oauth_request_url   : OA_REQ
    , oauth_access_url    : OA_ACCESS
    , consumer_key        : config.consumer_key
    , consumer_secret     : config.consumer_secret
    , access_token        : config.access_token
    , access_token_secret : config.access_token_secret
  }

  this.config = config;
  this.config.oauth_request_url = OA_REQ;
  this.config.oauth_access_url = OA_ACCESS;
  this.access_token_ready_cb = access_token_ready_cb;

  //authenticate our oauth client
  if (this.config.app_only_auth) {
    this.auth = new AppOnlyAuth(this.config,this.access_token_ready_cb)
  } else {
    this.auth = new Auth(this.config)
  }
}

Twitter.prototype = {
  get: function (path, params, callback) {
    return this.request('GET', path, params, callback)
  },
  post: function (path, params, callback) {
    return this.request('POST', path, params, callback)
  },
  request: function (method, path, params, callback) {
    // if no `params` is specified but a callback is, use default params
    if (typeof params === 'function') {
      callback = params
      params = {}
    }

    // clone `params` object so we can modify it without modifying the user's reference
    var paramsClone = JSON.parse(JSON.stringify(params))

    // special case for media/upload. This lives in a different subdomain.
    if (path === 'media/upload') {
      // build the full url
      var finalPath = MEDIA_UPLOAD + path + '.json'

      return new OARequest(
          this.auth
        , method
        , finalPath
        , paramsClone
      ).end(callback)
    }

    // regex to extract :params from `path`
    var rgxParam = /\/:(\w+)/g
    var missingParamErr = null

    // extract params like from paths like statuses/retweet/:id
    // and replace them with user-supplied params
    path = path.replace(rgxParam, function (hit) {
      var paramName = hit.slice(2)
      var userVal = paramsClone[paramName]

      if (!userVal) {
        missingParamErr = new Error('Twit: Params object is missing a required parameter for this request: `'+paramName+'`')
        return
      }

      // clone this param value, and delete from `paramsClone` so we don't pass it in the querystring or body
      var retVal = '/' + userVal
      delete paramsClone[paramName]

      return retVal
    })
    // build the full url
    var finalPath = REST_ROOT + path + '.json'

    // if we got a missing param, return the error to the user
    if (missingParamErr) {
      return callback(missingParamErr)
    }

    // convert any arrays in `paramsClone` to comma-seperated strings
    var finalParams = this.normalizeParams(paramsClone)

    return new OARequest(
        this.auth
      , method
      , finalPath
      , finalParams
    ).end(callback)
  },
  stream: function (path, params) {
    var stream_endpoint_map = {
      user: USER_STREAM,
      site: SITE_STREAM
    }

    var ROOT = stream_endpoint_map[path] || PUB_STREAM

    var streamPath = ROOT + path + '.json'
    var finalParams = this.normalizeParams(params)

    return new OARequest(this.auth, 'POST', streamPath, finalParams).persist()
  },
  normalizeParams: function (params) {
    var normalized = params
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(function (key) {
        var value = params[key]
        // replace any arrays in `params` with comma-separated string
        if (Array.isArray(value))
          normalized[key] = value.join(',')
      })
    } else if (!params) {
      normalized = {}
    }
    return normalized
  },
  setAuth: function (auth) {
    var self = this
    var authKeys = [ 'consumer_key', 'consumer_secret', 'access_token', 'access_token_secret' ];

    // update config
    authKeys.forEach(function (authKey) {
      if (auth[authKey]) {
        self.config[authKey] = auth[authKey]
      }
    })

    // create a new auth object
    if (this.config.app_only_auth) {
      this.auth = new AppOnlyAuth(this.config,this.access_token_ready_cb)
    } else {
      this.auth = new Auth(this.config)
    }
  },
  getAuth: function () {
    return this.config
  }
}

module.exports = Twitter
