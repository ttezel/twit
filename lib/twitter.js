//
//  Twitter API Wrapper
//
var assert = require('assert');
var request = require('request');
var util = require('util');
var endpoints = require('./endpoints');
var helpers = require('./helpers');
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
}

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

  self._buildReqOpts(method, path, params, false, function (err, reqOpts) {
    if (err) {
      callback(err, null, null)
      return
    }

    var twitOptions = (params && params.twit_options) || {}

    process.nextTick(function () {
      // ensure all HTTP i/o occurs after the user has a chance to bind their event handlers
      self._doRestApiRequest(reqOpts, twitOptions, method, callback)
    })
  })

  return self
}

/**
 * Builds and returns an options object ready to pass to `request()`
 * @param  {String}   method      "GET" or "POST"
 * @param  {String}   path        REST API resource uri (eg. "statuses/destroy/:id")
 * @param  {Object}   params      user's params object
 * @param  {Boolean}  isStreaming Flag indicating if it's a request to the Streaming API (different endpoint)
 * @returns {Undefined}
 *
 * Calls `callback` with Error, Object where Object is an options object ready to pass to `request()`.
 *
 * Returns error raised (if any) by `helpers.moveParamsIntoPath()`
 */
Twitter.prototype._buildReqOpts = function (method, path, params, isStreaming, callback) {
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

  try {
    // finalize the `path` value by building it using user-supplied params
    path = helpers.moveParamsIntoPath(finalParams, path)
  } catch (e) {
    callback(e, null, null)
    return
  }

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

  if (!self.config.app_only_auth) {
    // with user auth, we can just pass an oauth object to requests
    // to have the request signed
    reqOpts.oauth = {
      consumer_key: self.config.consumer_key,
      consumer_secret: self.config.consumer_secret,
      token: self.config.access_token,
      token_secret: self.config.access_token_secret,
    }

    callback(null, reqOpts);
    return;
  } else {
    // we're using app-only auth, so we need to ensure we have a bearer token
    // Once we have a bearer token, add the Authorization header and return the fully qualified `reqOpts`.
    self._getBearerToken(function (err, bearerToken) {
      if (err) {
        callback(err, null)
        return
      }

      reqOpts.headers['Authorization'] = 'Bearer ' + bearerToken;
      callback(null, reqOpts)
      return
    })
  }
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

/**
 * Creates/starts a connection object that stays connected to Twitter's servers
 * using Twitter's rules.
 *
 * @param  {String} path   Resource path to connect to (eg. "statuses/sample")
 * @param  {Object} params user's params object
 * @return {StreamingAPIConnection}        [description]
 */
Twitter.prototype.stream = function (path, params) {
  var self = this;
  var twitOptions = (params && params.twit_options) || {};

  var streamingConnection = new StreamingAPIConnection()
  self._buildReqOpts('POST', path, params, true, function (err, reqOpts) {
    if (err) {
      // we can get an error if we fail to obtain a bearer token or construct reqOpts
      // surface this on the streamingConnection instance (where a user may register their error handler)
      streamingConnection.emit('error', err)
      return
    }
    // set the properties required to start the connection
    streamingConnection.reqOpts = reqOpts
    streamingConnection.twitOptions = twitOptions

    process.nextTick(function () {
      streamingConnection.start()
    })
  })

  return streamingConnection
}

/**
 * Gets bearer token from cached reference on `self`, or fetches a new one and sets it on `self`.
 *
 * @param  {Function} callback Function to invoke with (Error, bearerToken)
 * @return {Undefined}
 */
Twitter.prototype._getBearerToken = function (callback) {
  var self = this;
  if (self._bearerToken) {
    return callback(null, self._bearerToken)
  }

  helpers.getBearerToken(self.config.consumer_key, self.config.consumer_secret,
  function (err, bearerToken) {
    if (err) {
      // return the fully-qualified Twit Error object to caller
      callback(err, null);
      return;
    }
    self._bearerToken = bearerToken;
    callback(null, self._bearerToken);
    return;
  })
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
    var auth_type = 'app-only auth'
    var required_keys = required_for_app_auth
  } else {
    var auth_type = 'user auth'
    var required_keys = required_for_user_auth
  }

  required_keys.forEach(function (req_key) {
    if (!config[req_key]) {
      var err_msg = util.format('Twit config must include `%s` when using %s.', req_key, auth_type)
      throw new Error(err_msg)
    }
  })
}

module.exports = Twitter
