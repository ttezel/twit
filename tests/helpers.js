

exports.generateRandomString = function generateRandomString (length) {
  var length = length || 10
  var ret = ''
  for (var i = 0; i < length; i++) {
    // use an easy set of unicode as an alphabet - twitter won't reformat them
    // which makes testing easier
    ret += String.fromCharCode(Math.floor(Math.random()*90) + 33)
  }

  ret = encodeURI(ret)

  return ret
}
