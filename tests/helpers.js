

exports.generateRandomString = function generateRandomString (length) {
  var length = length || 10
  var ret = ''
  var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++) {
    // use an easy set of unicode as an alphabet - twitter won't reformat them
    // which makes testing easier
    ret += alphabet[Math.floor(Math.random()*alphabet.length)]
  }

  ret = encodeURI(ret)

  return ret
}
