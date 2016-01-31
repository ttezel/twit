var assert = require('assert')
var Twit = require('../lib/twitter')
var config1 = require('../config1')
var streaming = require('./streaming')

//verify `friendsMsg` is a twitter 'friends' message object
function checkFriendsMsg (friendsMsg) {
    var friendIds = friendsMsg.friends

    assert(friendIds)
    assert(Array.isArray(friendIds))
    assert(friendIds[0])
}

describe('user events', function () {
    it('friends', function (done) {
        var twit = new Twit(config1);
        var stream = twit.stream('user');

        //make sure we're connected to the right endpoint
        assert.equal(stream.reqOpts.url, 'https://userstream.twitter.com/1.1/user.json')

        stream.on('friends', function (friendsMsg) {
            checkFriendsMsg(friendsMsg)

            stream.stop()
            done()
        })

        stream.on('connect', function () {
            console.log('\nuser stream connecting..')
        })

        stream.on('connected', function () {
            console.log('user stream connected.')
        })
    })
})