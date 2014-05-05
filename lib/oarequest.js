//
//  Create and execute http requests to an Oauth-protected resource
//
var EventEmitter = require('events').EventEmitter
  , querystring = require('querystring')
  , util = require('util')
  , Parser = require('./parser')
  , Auth = require('./auth')

/**
 * OAuth http request
 *
 * @param {Object} oauth
 * @param {String} method   GET or POST
 * @param {String} path     REST resource
 * @param {Object} params   query params
 */
function OARequest (oauth, method, path, params) {
  if (method !== 'GET' && method !== 'POST') {
    throw new Error('method `'+method+'` not supported.\n')
  }
  this.oauth = oauth
  this.method = method

  if (method === 'GET') {
    this.path = path + (params ? '?' + querystring.stringify(params) : '')
    this.params = null
  } else if (method === 'POST') {
    this.path = path
    this.params = params
  }

  EventEmitter.call(this)
}

util.inherits(OARequest, EventEmitter)

/**
 * Perform http request & persist the connection
 * Emit events as they come in from twitter
 */
OARequest.prototype.persist = function () {
  var self = this

  this.parser = new Parser()

  //handle twitter objects as they come in
  this.parser.on('element', function (msg) {
    // first msg; successful connection => reset reconnect interval
    self.connectInterval = 0
    if      (msg.delete)          { self.emit('delete', msg) }
    else if (msg.disconnect)      { self.handleDisconnect(msg) }
    else if (msg.limit)           { self.emit('limit', msg) }
    else if (msg.scrub_geo)       { self.emit('scrub_geo', msg) }
    else if (msg.warning)         { self.emit('warning', msg) }
    else if (msg.status_withheld) { self.emit('status_withheld', msg) }
    else if (msg.user_withheld)   { self.emit('user_withheld', msg) }
    else if (msg.friends)         { self.emit('friends', msg) }
    else if (msg.direct_message)  { self.emit('direct_message', msg) }
    else if (msg.event)           {
      self.emit('user_event', msg)
      // reference: https://dev.twitter.com/docs/streaming-apis/messages#User_stream_messages
      var ev = msg.event

      if      (ev === 'blocked')                { self.emit('blocked', msg) }
      else if (ev === 'unblocked')              { self.emit('unblocked', msg) }
      else if (ev === 'favorite')               { self.emit('favorite', msg) }
      else if (ev === 'unfavorite')             { self.emit('unfavorite', msg) }
      else if (ev === 'follow')                 { self.emit('follow', msg) }
      else if (ev === 'unfollow')               { self.emit('unfollow', msg) }
      else if (ev === 'user_update')            { self.emit('user_update', msg) }
      else if (ev === 'list_created')           { self.emit('list_created', msg) }
      else if (ev === 'list_destroyed')         { self.emit('list_destroyed', msg) }
      else if (ev === 'list_updated')           { self.emit('list_updated', msg) }
      else if (ev === 'list_member_added')      { self.emit('list_member_added', msg) }
      else if (ev === 'list_member_removed')    { self.emit('list_member_removed', msg) }
      else if (ev === 'list_user_subscribed')   { self.emit('list_user_subscribed', msg) }
      else if (ev === 'list_user_unsubscribed') { self.emit('list_user_unsubscribed', msg) }
      else                                      { self.emit('unknown_user_event', msg) }
    } else                                      { self.emit('tweet', msg) }
  })

  this.parser.on('error', function (err) {
    self.emit('error', err)
  })

  //kick off the persisting http request
  process.nextTick(function () {
    self.start()
  })

  return this
}

/**
 * Kick off the http request, and persist the connection
 *
 */
OARequest.prototype.start = function () {
  this.keepAlive()
  return this
}

/**
 * Abort the http request
 *
 */
OARequest.prototype.stop = function () {
  this.abortedBy = 'twit-client'
  this.request.abort()
  delete this.request
  return this
}

/**
 * Make http request and keep the connection alive. Handles the req events here.
 *
 * @return {Object} req http request object
 */
OARequest.prototype.keepAlive = function () {
  var self = this;
  this.abortedBy = null;
  // make request - passing in `null` causes request to be kept alive.
  this.request = this.makeRequest(null);

  this.response = null;

  this.request.once('response', function (response) {
    // reset our reconnection attempt flag
    self.usedFirstReconnect = false;
    self.response = response;
    self.emit('connected', self.response);
    self.response.setEncoding('utf8');

    //pass all response data to parser
    self.response.on('data', function (chunk) {
      // stop stall abort timer, and start a new one
      self.resetStallAbortTimeout();
      self.parser.parse(chunk);
    });

    self.response.once('close', function () {
      self.scheduleStreamReconnect(self.request, self.response);
    });

    self.response.on('error', function (err) {
      // expose response errors on twit instance
      self.emit('error', err)
    })
  });

  this.request.once('close', function () {
    self.stopStallAbortTimeout();

    // T.stop() was called - since we closed it explicitly, don't reconnect.
    if (self.abortedBy === 'twit-client')
      return

    // we got disconnected by twitter - reconnect according to their guidelines
    self.abortedBy = 'twitter';
    self.scheduleStreamReconnect(self.request, self.response);
  });

  this.request.once('error', function (err) {
    self.stopStallAbortTimeout();
    self.emit('error', err);
  });
  // send off the request
  this.request.end();
  this.emit('connect', this.request);
  return this;
}

/**
 * Schedule a keep-alive reconnect according to Twitter's reconnect guidelines
 * @param  {http.ClientRequest}   lastRequest   http request that we last made
 * @param  {http.IncomingMessage} response      response to the last request we made
 *
 */
OARequest.prototype.scheduleStreamReconnect = function (lastRequest, response) {
  var self = this;

  if (self.scheduledReconnect) {
    // if we already have a reconnect scheduled, don't schedule another one.
    // this race condition can happen if self.request and self.response both emit `close`
    return
  }

  if (response.statusCode === 420) {
    // we are being rate limited
    // start with a 1 minute wait and double each attempt
    if (!self.connectInterval) {
      self.connectInterval = 60000;
    } else {
      self.connectInterval *= 2;
    }
  } else if (String(response.statusCode).charAt(0) === '5') {
    // twitter 5xx errors
    // start with a 5s wait, double each attempt up to 320s
    if (!self.connectInterval) {
      self.connectInterval = 5000;
    } else if (self.connectInterval < 320000) {
      self.connectInterval *= 2;
    } else {
      self.connectInterval = 320000;
    }
  } else {
    // tcp error, or a stall in the stream (and stall timer closed the connection)
    if (!self.usedFirstReconnect) {
      // first reconnection attempt on a valid connection should occur immediately
      self.connectInterval = 0;
      self.usedFirstReconnect = true;
    } else if (self.connectInterval < 16000) {
      // linearly increase delay by 250ms up to 16s
      self.connectInterval += 250;
    } else {
      // cap out reconnect interval at 16s
      self.connectInterval = 16000;
    }
  }

  self.emit('reconnect', lastRequest, response, self.connectInterval);

  // schedule the reconnect
  self.scheduledReconnect = setTimeout(function () {
    self.keepAlive();
    delete self.scheduledReconnect;
  }, self.connectInterval);
}

/**
 * Handles a disconnect message from twitter. Closes the connection, and emits descriptive info
 *
 *
 * @param  {Object} msg - disconnect message received from twitter
 *
 */
OARequest.prototype.handleDisconnect = function (msg) {
  this.emit('disconnect', msg)
  this.stop()
  return this
}

/**
 *
 * Make an HTTP request to twitter, pass the parsed reply to @callback
 *
 * @param  {Function} callback
 *
 */
OARequest.prototype.end = function (callback) {
  function handler (err, raw, response) {
    if (err instanceof Error) {
      return callback(err, undefined, response)
    }

    // handle http errors
    if (err && !(err instanceof Error) && err.statusCode) {
      var error = new Error()
      var message = 'Unknown Twitter API Error';
      var code;
      var allErrors;

      // handle twitter api errors
      try {
        var parsedError = JSON.parse(err.data)

        if (parsedError.errors && parsedError.errors.length) {
          // default to the first error
          message = parsedError.errors[0].message
          code = parsedError.errors[0].code

          // save reference to all errors
          allErrors = parsedError.errors;
        }
      } catch (e) {
        // if error occurs, default properties are set on error object for message & code
      }

      error.message = message
      error.statusCode = err.statusCode
      error.code = code
      error.allErrors = allErrors

      // keep consistent with the rest of the error handling by passing the raw response data here
      error.twitterReply = err.data

      return callback(error, undefined, response)
    }

    // handle non-http errors
    if (err) {
      err.twitterReply = raw
      return callback(err, undefined, response)
    }

    // parse response
    var parsed = null
      , parseError = null

    try {
      parsed = JSON.parse(raw)
    } catch(e) {
      parseError = new Error('twitter reply is not a valid JSON string.')
      parseError.twitterReply = raw
    }

    // handle parsing errors
    if (parseError) {
      return callback(parseError, undefined, response)
    } else if (!parsed) {
      // null, false or empty reply
      var badReplyError = new Error('twitter sent bad reply: `'+parsed+'`.')
      badReplyError.twitterReply = raw

      return callback(badReplyError, undefined, response)
    }

    // success case
    return callback(null, parsed, response)
  }

  this.makeRequest(handler)
}

/**
 * Send off the HTTP request, passing back the reply to @cb
 * If no @cb, persists the connection.
 *
 * For use by OARequest.end() and OARequest.persist()
 *
 * @param  {Function} cb
 *
 */
OARequest.prototype.makeRequest = function (cb) {
  var action = this.method.toLowerCase()

  if (action !== 'get' && action !== 'post')
    throw new Error('method `'+action+'` not supported')

  //  GET
  if (action === 'get') {
    return this.oauth.oa.get(
        this.path
      , this.oauth.config.access_token
      , this.oauth.config.access_token_secret
      , cb
    )
  }

  //  POST
  return this.oauth.oa.post(
      this.path
    , this.oauth.config.access_token
    , this.oauth.config.access_token_secret
    , this.params
    , cb
  )
}



/**
 * Stop and restart the stall abort timer (called when new data is received)
 *
 */
OARequest.prototype.resetStallAbortTimeout = function () {
  var self = this;
  // stop the previous stall abort timer
  this.stopStallAbortTimeout();
  //start a new 90s timeout to trigger a close & reconnect if no data received
  this.stallAbortTimeout = setTimeout(function () {
    if (typeof self.request !== undefined) {
      self.request.abort();
      delete self.request;
    }
  }, 90000);
  return this;
}

/**
 * Stop stall timer
 *
 */
OARequest.prototype.stopStallAbortTimeout = function () {
  if (this.stallAbortTimeout) clearTimeout(this.stallAbortTimeout);
  return this;
}

module.exports = OARequest

