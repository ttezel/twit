var assert = require('assert')
var Twit = require('../lib/twitter')
var config = require('../config')

//verify `friendsMsg` is a twitter 'friends' message object
function checkFriendsMsg (friendsMsg) {
    var friendIds = friendsMsg.friends

    assert(friendIds)
    assert(Array.isArray(friendIds))
    assert(friendIds[0])
}

describe('user stream events', function () {
    var twit = new Twit(config)

    var ustream = twit.stream('user')

    it('friends', function (done) {
        ustream.on('friends', function (friendsMsg) {
            checkFriendsMsg(friendsMsg)
            done()
        })
    })

    //skip since `user_event` don't happen very often
    it.skip('user_event', function (done) {
        ustream.on('user_event', function (eventMsg) {
            console.log('got user_event:', eventMsg)
            done()
        })
    })

})