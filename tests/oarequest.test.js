var OARequest = require('../lib/oarequest')
var EventEmitter = require('events').EventEmitter
var assert = require('assert')

describe('OARequest', function () {

  describe('streaming', function () {
    it('aborts on 401 authorization error', function (done) {

      var origMakeRequest = OARequest.prototype.makeRequest

      OARequest.prototype.makeRequest = function (cb) {
        var req = new EventEmitter()
        req.end = function () {}
        var self = this
      

        // schedule events for next tick, once keepAlive
        // can add handlers
        process.nextTick(function () {

          req.emit('response', {
            statusCode: 401,
            setEncoding: function (){},
            on: function () {}
          })

          req.emit('close')

          assert(self.abortedBy === 'twit-client', 'the request should be aborted by the client')

        })

        return req
      }

      //
      var req = new OARequest({}, 'GET', '')


      req.on('error', function (err) {
        assert(err.code === 401, 'error should contain the http status code')
        done()
      })

      req.keepAlive()


    })
  })
  
})