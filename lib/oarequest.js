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
 * @param {Boolean} emitRaw   emit raw twitt '_raw'
 */
function OARequest (oauth, method, path, params, emitRaw) {
  if (method !== 'GET' && method !== 'POST') {
    throw new Error('method `'+method+'` not supported.\n')
  }
  this.oauth = oauth
  this.method = method
  if (method === 'GET'){
    this.path = path + (params ? '?' + querystring.stringify(params) : '')
    this.params = null;
  }else if (method === 'POST'){
    this.path = path;
    this.params = params;
  }
  this.emitRaw = (emitRaw != null) ? emitRaw : false;
  
  EventEmitter.call(this)
}

util.inherits(OARequest, EventEmitter)

/**
 * Perform http request & persist the connection
 * Emit events as they come in from twitter
 */
OARequest.prototype.persist = function () {
  var self = this

  this.parser = new Parser(this.emitRaw)

  //handle twitter objects as they come in
  this.parser.on('element', function (msg) {
    // first msg; successful connection => reset reconnect interval
    self.connectInterval = 0
    if      (msg['delete'])     { self.emit('delete', msg) }
    else if (msg['disconnect']) { self.handleDisconnect(msg) }
    else if (msg['limit'])      { self.emit('limit', msg) }     
    else if (msg['scrub_geo'])  { self.emit('scrub_geo', msg) }
    else                        { self.emit('tweet', msg) }
  })
  
  this.parser.on('error', function (err) { 
    self.emit('error', err) 
  })

  //kick off the persisting http request
  this.start()
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
      //self.abortedBy gets set to `twit-client` if .stop() is called
      //in that case, do not schedule a reconnect; return immediately
      if (self.abortedBy === 'twit-client')
        return

      //remember we got disconnected by Twitter and the reconnect is 
      //about to get scheduled
      self.abortedBy = 'twitter'
      
      if (self.connectInterval === undefined) {
        self.request = self.keepAlive()
        self.connectInterval = 0
        return
      }
      //rate limited - back off for a minute (danger of getting blocked by twitter)
      if (res && res.statusCode === 420) 
        self.connectInterval = 60000
      //double til 320s
      else if (self.connectInterval >= 16000 && self.connectInterval <= 320000) 
        self.connectInterval = 2*self.connectInterval
      else if (self.connectInterval <= 320000) 
        self.connectInterval += 250
      
      self.emit('reconnect', self.request, res, self.connectInterval)
      
      setTimeout(function () {
        self.request = self.keepAlive()
      }, self.connectInterval)
    })
    .on('error', function (err) {
      //don't need to do anything here; this gets called when the request is abort()'ed' 
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
  this.makeRequest(function(err, raw, response) {
    if (err) {
      err.twitterReply = raw
      callback(err, null)
      return
    }

    var parsed = null
      , error = null

    try {
      parsed = JSON.parse(raw)
    } catch(e) {
      error = new Error('twitter reply is not a valid JSON string.')
      error.twitterReply = raw
    } finally {
      callback(error, parsed)
      return
    }
  })
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
  var action = this.method.toLowerCase();

  switch(action) {
    case 'get':
      return this.oauth.oa.get(
          this.path
        , this.oauth.config.access_token
        , this.oauth.config.access_token_secret
        , cb
      )
      break
    case 'post':
      return this.oauth.oa.post(
          this.path
        , this.oauth.config.access_token
        , this.oauth.config.access_token_secret
        , this.params
        , cb
      )
      break
    default:
      throw new Error('method '+this.method+' not supported') 
  }
}

module.exports = OARequest

