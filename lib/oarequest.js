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
  return this
}

/**
 * Make http request and keep the connection alive. Handles the req events here.
 *
 * @return {Object} req http request object
 */
OARequest.prototype.keepAlive = function () {
  var self = this

  this.abortedBy = null

  //http req and res objects
  this.request = this.makeRequest(null)

  var res = null

  this.request.on('response', function (response) {
      res = response
      res.setEncoding('utf8')

      //pass all response data to parser to get parsed
      res.on('data', function (chunk) {
        //reset stall timer
        self.resetStallTimer()

        self.parser.parse(chunk)
      })
    })
    //tcp errors:
    //250ms , increment linearly til 16s
    //http errors:
    //5s, double til 320s
    //
    //back off linearly @ 250ms til 16s, then double til 320s
    .on('close', function () {
      self.stopStallTimer()

      //self.abortedBy gets set to `twit-client` if .stop() is called
      //in that case, do not schedule a reconnect; return immediately
      if (self.abortedBy === 'twit-client')
        return

      //remember we got disconnected by Twitter and the reconnect is
      //about to get scheduled
      self.abortedBy = 'twitter'

      if (self.connectInterval === undefined) {
        self.connectInterval = 0
        return self.keepAlive()
      }
      //rate limited - back off for a minute (danger of getting blocked by twitter)
      if (res && res.statusCode === 420)
        self.connectInterval = 60000
      //increment by 250ms linearly til 16s
      else if (self.connectInterval < 16000)
        self.connectInterval += 250
      //double til 320s
      else if (self.connectInterval >= 16000 && self.connectInterval <= 320000)
        self.connectInterval = 2*self.connectInterval

      self.emit('reconnect', self.request, res, self.connectInterval)

      setTimeout(function () {
        self.keepAlive()
      }, self.connectInterval)
    })
    .on('error', function (err) {
      self.stopStallTimer()
    })
    .end()

  this.emit('connect', this.request)

  return this
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
      return callback(err)
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

      return callback(error)
    }

    // handle non-http errors
    if (err) {
      err.twitterReply = raw
      return callback(err)
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
      return callback(parseError)
    } else if (!parsed) {
      // null, false or empty reply
      var badReplyError = new Error('twitter sent bad reply: `'+parsed+'`.')
      badReplyError.twitterReply = raw

      return callback(badReplyError)
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
 * Stops and restarts the stall timer
 *
 */
OARequest.prototype.resetStallTimer = function () {
  var self = this

  this.stopStallTimer()

  //start a 90s timer to trigger a reconnect
  this.stallTimer = setTimeout(function () {
    self.request.abort()
  }, 90000)
}

/**
 * Stops stall timer
 *
 */
OARequest.prototype.stopStallTimer = function () {
  if (this.stallTimer)
    clearTimeout(this.stallTimer)
}

module.exports = OARequest

