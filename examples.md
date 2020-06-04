Example for a DM response when a user follows
```javascript

// Setting up a user stream
var stream = T.stream('user');

function followed(eventMsg) {
  console.log('Follow event!');
  var name = eventMsg.source.name;
  var screenName = eventMsg.source.screen_name;

  // Anytime Someone follows me
 stream.on('follow', followed);

  // the post request for direct messages > need to add a function to handle errors

  setTimeout(function() {  // wait 60 sec before sending direct message.
    console.log("Direct Message sent");
     T.post("direct_messages/new", {
      screen_name: screenName,
      text: 'Thanks for following' + ' ' + screenName + '! ' + ' What you want to be sent to a new follower '
     });
  }, 1000*10);  // will respond via direct message 10 seconds after a user follows.
};
```