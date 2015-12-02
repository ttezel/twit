var Twit = require('../lib/twitter'),
  pathHelper = require('path'),
  fs = require('fs'),
  mime = require('mime'),
  config = require('../config1');

var T = new Twit(config);


var fileName = 'test_libx264.mp4',
 mediaFile = fs.createReadStream(pathHelper.join(__dirname, fileName)),
 mediaType = mime.lookup(pathHelper.join(__dirname, fileName)),
 mediaLength = fs.statSync(pathHelper.join(__dirname, fileName))["size"],
 mediaTmpId = '';

//Let's do the Chunk as Twitter doc ask us : https://dev.twitter.com/rest/public/uploading-media#chunkedupload
console.log('Initializing...');
T.post('media/upload', {
  'command': 'INIT',
  'media_type': mediaType,
  'total_bytes': mediaLength
}, function(err, data, response) {
  if (err) {
    console.log('ERROR ON INIT:', err);
    process.exit(1);
  } else {
    mediaTmpId = data.media_id_string;
    console.log('Appending...');
    T.post('media/upload', {
      command: 'APPEND',
      media_id: data.media_id_string,
      segment_index: 0,
      media: mediaFile
    }, function(err, data, response) {
      if (err) {
        console.log('ERROR ON APPEND:', err);
        process.exit(1);
      } else {
        console.log('Finalizing...');
        T.post('media/upload', {
          command: 'FINALIZE',
          media_id: mediaTmpId
        }, function(err, data, response) {
          if (err) {
            console.log('ERROR ON FINALIZE:', err);
            process.exit(1);
          } else {
            console.log('Posting...');
            var mediaIdStr = data.media_id_string
            var params = {
              status: 'This video is awesome',
              media_ids: [mediaIdStr]
            }
            T.post('statuses/update', params, function(err, data, response) {
              if (err) {
                console.log('ERROR ON POST UPDATE:', err);
                process.exit(1);
              } else {
                console.log(data);
              }
            });
          }
        });
      }
    });
  }
});