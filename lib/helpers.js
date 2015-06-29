var querystring = require('querystring');
var request = require('request');

/**
 * Encodes object as a querystring, to be used as the suffix of request URLs.
 * @param  {Object} obj
 * @return {String}
 */
exports.makeQueryString = function (obj) {
  var qs = querystring.stringify(obj)
  qs = qs.replace(/\!/g, "%21")
         .replace(/\'/g, "%27")
         .replace(/\(/g, "%28")
         .replace(/\)/g, "%29")
         .replace(/\*/g, "%2A");
  return qs
}

/**
 * For each `/:param` fragment in path, move the value in params
 * at that key to path. If the key is not found in params, throw.
 * Modifies both params and path values.
 *
 * @param  {Objet} params  Object used to build path.
 * @param  {String} path   String to transform.
 * @return {Undefined}
 *
 */
exports.moveParamsIntoPath = function (params, path) {
  var rgxParam = /\/:(\w+)/g
  var missingParamErr = null

  path = path.replace(rgxParam, function (hit) {
    var paramName = hit.slice(2)
    var suppliedVal = params[paramName]
    if (!suppliedVal) {
      throw new Error('Twit: Params object is missing a required parameter for this request: `'+paramName+'`')
    }
    var retVal = '/' + suppliedVal
    delete params[paramName]
    return retVal
  })
  return path
}

/**
 * When Twitter returns a response that looks like an error response,
 * use this function to attach the error info in the response body to `err`.
 *
 * @param  {Error} err   Error instance to which body info will be attached
 * @param  {Object} body JSON object that is the deserialized HTTP response body received from Twitter
 * @return {Undefined}
 */
exports.attachBodyInfoToError = function (err, body) {
  err.twitterReply = body;
  if (!body) {
    return
  }
  if (body.error) {
    // the body itself is an error object
    err.message = body.error
    err.allErrors = err.allErrors.concat([body])
  } else if (body && body.errors && body.errors.length) {
    // body contains multiple error objects
    err.message = body.errors[0].message;
    err.code = body.errors[0].code;
    err.allErrors = err.allErrors.concat(body.errors)
  }
}

exports.makeTwitError = function (message) {
  var err = new Error()
  if (message) {
    err.message = message
  }
  err.code = null
  err.allErrors = []
  err.twitterReply = null
  return err
}

/**
 * Get a bearer token for OAuth2
 * @param  {String}   consumer_key
 * @param  {String}   consumer_secret
 * @param  {Function} cb
 */
exports.getBearerToken = function (consumer_key, consumer_secret, cb) {
  // use OAuth 2 for app-only auth (Twitter requires this)
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
