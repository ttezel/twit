//
//  Twitter API Wrapper
//
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Auth = require('./auth')
var endpoints = require('./endpoints')
var OARequest = require('./oarequest')

//
//  Twitter
//
var Twitter = function (config) {
  var self = this
  var credentials = {
    consumer_key        : config.consumer_key,
    consumer_secret     : config.consumer_secret,
    // access_token and access_token_secret only required for user auth
    access_token        : config.access_token,
    access_token_secret : config.access_token_secret,
    // flag indicating whether requests should be made with application-only auth
    app_only_auth       : config.app_only_auth,
  }

  this.config = config;
  //authenticate our oauth client
  this.auth = new Auth(credentials)

  EventEmitter.call(this)
}

util.inherits(Twitter, EventEmitter)

Twitter.prototype.get = function (path, params, callback) {
  return this.request('GET', path, params, callback)
}

Twitter.prototype.post = function (path, params, callback) {
  return this.request('POST', path, params, callback)
}

Twitter.prototype.request = function (method, path, params, callback) {
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
    var finalPath = endpoints.MEDIA_UPLOAD + path + '.json'

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
  var finalPath = endpoints.REST_ROOT + path + '.json'

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
}

Twitter.prototype.stream = function (path, params) {
  var stream_endpoint_map = {
    user: endpoints.USER_STREAM,
    site: endpoints.SITE_STREAM
  }

  var base_uri = stream_endpoint_map[path] || endpoints.PUB_STREAM
  var streamPath = base_uri + path + '.json'
  var finalParams = this.normalizeParams(params)

  return new OARequest(this.auth, 'POST', streamPath, finalParams).persist()
}

Twitter.prototype.normalizeParams = function (params) {
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
}

Twitter.prototype.setAuth = function (auth) {
  var self = this
  var configKeys = [
    'consumer_key',
    'consumer_secret',
    'access_token',
    'access_token_secret'
  ];

  // update config
  configKeys.forEach(function (k) {
    if (auth[k]) {
      self.config[k] = auth[k]
    }
  })

  // create a new auth object
  this.auth = new Auth(this.config)
}

Twitter.prototype.getAuth = function () {
  return this.config
}

module.exports = Twitter
