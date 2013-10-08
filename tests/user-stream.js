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
    var twit = new Twit(config1)

    it('friends', function (done) {
        var ustream = twit.stream('user')

        //make sure we're connected to the right endpoint
        assert.equal(ustream.path, 'https://userstream.twitter.com/1.1/user.json')

        ustream.on('friends', function (friendsMsg) {
            checkFriendsMsg(friendsMsg)

            ustream.stop()
            done()
        })
    })

    //skip since `user_event` don't happen very often
    it.skip('user_event', function (done) {
        var ustream = twit.stream('user')

        ustream.on('user_event', function (eventMsg) {
            console.log('got user_event:', eventMsg)

            ustream.stop()
            done()
        })
    })

})