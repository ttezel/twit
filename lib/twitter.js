//
//  Twitter API Wrapper
//
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var request = require('request');
var util = require('util');
var Auth = require('./auth');
var endpoints = require('./endpoints');
var helpers = require('./helpers');
var OARequest = require('./oarequest');
var StreamingAPIConnection = require('./streaming-api-connection');
var STATUS_CODES_TO_ABORT_ON = require('./settings').STATUS_CODES_TO_ABORT_ON;

// config values required for app-only auth
var required_for_app_auth = [
  'consumer_key',
  'consumer_secret'
];

// config values required for user auth (superset of app-only auth)
var required_for_user_auth = required_for_app_auth.concat([
  'access_token',
  'access_token_secret'
]);

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

  this._validateConfigOrThrow(config);
  this.config = config;

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

  try {
    var reqOpts = self._buildReqOpts(method, path, params, false)
  } catch (e) {
    callback(e, null, null)
    return self
  }

  var twitOptions = (params && params.twit_options) || {}

  process.nextTick(function () {
    // ensure all HTTP i/o occurs after the user has a chance to bind their event handlers
    self._doRestApiRequest(reqOpts, twitOptions, method, callback)
  })
  return self
}

/**
 * Builds and returns an options object ready to pass to `request()`
 * @param  {String}   method      "GET" or "POST"
 * @param  {String}   path        REST API resource uri (eg. "statuses/destroy/:id")
 * @param  {Object}   params      user's params object
 * @param  {Boolean}  isStreaming Flag indicating if it's a request to the Streaming API (different endpoint)
 * @return {Object}               Object ready to pass to `request()`
 *
 * Throws error raised (if any) by `helpers.moveParamsIntoPath()`
 */
Twitter.prototype._buildReqOpts = function (method, path, params, isStreaming) {
  var self = this
  if (!params) {
    params = {}
  }
  // clone `params` object so we can modify it without modifying the user's reference
  var paramsClone = JSON.parse(JSON.stringify(params))
  // convert any arrays in `paramsClone` to comma-seperated strings
  var finalParams = this.normalizeParams(paramsClone)
  delete finalParams.twit_options

  // the options object passed to `request` used to perform the HTTP request
  var reqOpts = {
    headers: {

    },
    // gzip: true,
  }
  // TODO(tolga): test with gzip: true

  if (!self.config.app_only_auth) {
    // with user auth, we can just pass an oauth object to requests
    // to have the request signed
    reqOpts.oauth = {
      consumer_key: self.config.consumer_key,
      consumer_secret: self.config.consumer_secret,
      token: self.config.access_token,
      token_secret: self.config.access_token_secret,
    }
  }

  path = helpers.moveParamsIntoPath(finalParams, path)

  if (isStreaming) {
    var stream_endpoint_map = {
      user: endpoints.USER_STREAM,
      site: endpoints.SITE_STREAM
    }
    var endpoint = stream_endpoint_map[path] || endpoints.PUB_STREAM
    reqOpts.url = endpoint + path + '.json'
  } else {
    // special case for media/upload
    if (path === 'media/upload') {
      reqOpts.url = endpoints.MEDIA_UPLOAD + 'media/upload.json'
      reqOpts.headers['Content-type'] = 'multipart/form-data'
      reqOpts.formData = finalParams
      // set finalParams to empty object so we don't append a query string
      // of the params
      finalParams = {}
    } else {
      reqOpts.url = endpoints.REST_ROOT + path + '.json'
      reqOpts.headers['Content-type'] = 'application/json'
    }
  }

  if (Object.keys(finalParams).length) {
    // not all of the user's parameters were used to build the request path
    // add them as a query string
    var qs = helpers.makeQueryString(finalParams)
    reqOpts.url += '?' + qs
  }

  return reqOpts
}

/**
 * Make HTTP request to Twitter REST API.
 * @param  {Object}   reqOpts     options object passed to `request()`
 * @param  {Object}   twitOptions
 * @param  {String}   method      "GET" or "POST"
 * @param  {Function} callback    user's callback
 * @return {Undefined}
 */
Twitter.prototype._doRestApiRequest = function (reqOpts, twitOptions, method, callback) {
  var request_method = request[method.toLowerCase()];
  var req = request_method(reqOpts);

  var body = '';
  var response = null;

  var onRequestComplete = function () {
    try {
      body = JSON.parse(body)
    } catch (jsonDecodeError) {
      // there was no transport-level error, but a JSON object could not be decoded from the request body
      // surface this to the caller
      var err = helpers.makeTwitError('JSON decode error: Twitter HTTP response body was not valid JSON')
      err.statusCode = response ? response.statusCode: null;
      err.allErrors.concat({error: jsonDecodeError.toString()})
      callback(err, body, response);
      return
    }

    if (body.error || body.errors) {
      // we got a Twitter API-level error response
      // place the errors in the HTTP response body into the Error object and pass control to caller
      var err = helpers.makeTwitError('Twitter API Error')
      err.statusCode = response ? response.statusCode: null;
      helpers.attachBodyInfoToError(err, body);
      callback(err, body, response);
      return
    }

    // success case - no errors in HTTP response body
    callback(err, body, response)
  }

  req.on('response', function (res) {
    response = res
    // read data from `request` object which contains the decompressed HTTP response body,
    // `response` is the unmodified http.IncomingMessage object which may contain compressed data
    req.on('data', function (chunk) {
      body += chunk.toString('utf8')
    })
    // we're done reading the response
    req.on('end', function () {
      onRequestComplete()
    })
  })

  req.on('error', function (err) {
    // transport-level error occurred - likely a socket error
    if (twitOptions.retry &&
        STATUS_CODES_TO_ABORT_ON.indexOf(err.statusCode) !== -1
    ) {
      // retry the request since retries were specified and we got a status code we should retry on
      self.request(method, path, params, callback);
      return;
    } else {
      // pass the transport-level error to the caller
      err.statusCode = null
      err.code = null
      err.allErrors = [];
      helpers.attachBodyInfoToError(err, body)
      callback(err, body, response);
      return;
    }
  })
}

// /**
//  * Returns a headers object for making HTTP requests
//  * @return {Object} headers object
//  */
// Twitter.prototype._makeHeaders = function () {
//   var self = this
//   if (self.config.app_only_auth) {
//     assert(self.bearerToken)
//     return {
//       'Content-type': 'application/json',
//       'Authorization': 'Bearer ' + self.bearerToken
//     }
//   }
//   // user auth
//   return {
//     'Content-type': 'application/json',
//   }
// }

/**
 * Creates/starts a connection object that stays connected to Twitter's servers
 * using Twitter's rules.
 *
 * @param  {String} path   Resource path to connect to (eg. "statuses/sample")
 * @param  {Object} params user's params object
 * @return {StreamingAPIConnection}        [description]
 */
Twitter.prototype.stream = function (path, params) {
  var twitOptions = (params && params.twit_options) || {}
  var reqOpts = this._buildReqOpts('POST', path, params, true)

  var streamingConnection = new StreamingAPIConnection(reqOpts, twitOptions);
  process.nextTick(function () {
    streamingConnection.start()
  })

  return streamingConnection
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
  this._validateConfigOrThrow(self.config);
}

Twitter.prototype.getAuth = function () {
  return this.config
}

//
// Check that the required auth credentials are present in `config`.
// @param {Object}  config  Object containing credentials for REST API auth
//
Twitter.prototype._validateConfigOrThrow = function (config) {
  //check config for proper format
  if (typeof config !== 'object') {
    throw new TypeError('config must be object, got ' + typeof config)
  }

  if (config.app_only_auth) {
    var required_keys = required_for_app_auth
  } else {
    var required_keys = required_for_user_auth
  }

  required_keys.forEach(function (req_key) {
    if (!config[req_key]) {
      var err_msg = util.format('config must provide %s for %s.', req_key, auth_type)
      throw new Error(err_msg)
    }
  })
}

module.exports = Twitter
