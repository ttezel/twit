//
//  Twitter API Wrapper
//
var assert = require('assert')
var EventEmitter = require('events').EventEmitter
var querystring = require('querystring')
var request = require('request')
var util = require('util')
var Auth = require('./auth')
var endpoints = require('./endpoints')
var OARequest = require('./oarequest')

// set of status codes where we don't attempt reconnects
var STATUS_CODES_TO_ABORT_ON = [ 400, 401, 403, 404, 406, 410, 422 ];

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

  this.config = config
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
  var self = this
  assert(method == 'GET' || method == 'POST')
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

  // if we got a missing param, return the error to the user
  if (missingParamErr) {
    return callback(missingParamErr)
  }

  // convert any arrays in `paramsClone` to comma-seperated strings
  var finalParams = this.normalizeParams(paramsClone)

  var reqOpts = {
    json: true,
  }

  reqOpts.url = endpoints.REST_ROOT + path + '.json'

  if (finalParams) {
    var qs = querystring.stringify(finalParams)
    qs = qs.replace(/\!/g, "%21")
           .replace(/\'/g, "%27")
           .replace(/\(/g, "%28")
           .replace(/\)/g, "%29")
           .replace(/\*/g, "%2A");

    reqOpts.url += '?' + qs
  }

  reqOpts.headers = self._makeHeaders()
  if (!self.config.app_only_auth) {
    // with user auth, we can just pass an oauth object to requests
    reqOpts.oauth = {
      consumer_key: self.config.consumer_key,
      consumer_secret: self.config.consumer_secret,
      token: self.config.access_token,
      token_secret: self.config.access_token_secret,
    }
  }

  var attachBodyInfoToError = function (err, body) {
    err.twitterReply = body;
    // if errors are present in body, normalize them into our Error object
    if (body && body.errors && body.errors.length) {
      err.message = body.errors[0].message;
      err.code = body.errors[0].code;
      err.allErrors = body.errors;
    }
  }

  request[method.toLowerCase()](reqOpts, function (err, response, body) {
    if (err) {
      // likely a socket error
      if (params.twit_options && params.twit_options.retry &&
          STATUS_CODES_TO_ABORT_ON.indexOf(err.statusCode) !== -1
      ) {
        // retry the request
        self.request(method, path, params, callback);
        return;
      } else {
        // normalize the Error object and pass control to caller
        err.statusCode = response ? response.statusCode : null
        err.code = null
        err.allErrors = [];
        attachBodyInfoToError(err, body)
        callback(err, body, response);
        return;
      }
    }

    if (body.errors) {
      // place the errors in the HTTP response body into the Error object and pass control to caller
      var err = new Error();
      err.message = 'Twitter API Error';
      err.statusCode = response ? response.statusCode: null;
      attachBodyInfoToError(err, body);
      callback(err, body, response);
      return
    }

    // success case - no errors in HTTP response body
    callback(err, body, response)
  })
}

/**
 * Returns a headers object for making HTTP requests
 * @return {Object} headers object
 */
Twitter.prototype._makeHeaders = function () {
  var self = this
  if (self.config.app_only_auth) {
    assert(self.bearerToken)
    return {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + self.bearerToken
    }
  }
  // user auth
  return {
    'Content-type': 'application/json',
  }
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
