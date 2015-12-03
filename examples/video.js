"use strict";
var Twit = require('../lib/twitter'),
  pathHelper = require('path'),
  fs = require('fs'),
  mime = require('mime'),
  config = require('../config1'),
  T = new Twit(config),
  fileName = 'test_libx264.mp4',
  maxFileSize = 15 * 1024 * 1024,
  maxFileChunk = 5 * 1024 * 1024,
  mediaFile = fs.createReadStream(pathHelper.join(__dirname, fileName), {
    highWatermark: maxFileChunk
  }),
  mediaType = mime.lookup(pathHelper.join(__dirname, fileName)),
  mediaLength = fs.statSync(pathHelper.join(__dirname, fileName)).size;

var finalize = function(media_id) {
  console.log('Finalizing...');
  T.post('media/upload', {
    command: 'FINALIZE',
    media_id: media_id
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

var append = function(media_id, chunk_part, segment_index) {
  //console.log('Appending segment ', segment_index, ' of media_id: ', media_id, ' of size: ', chunk_part.length);
  T.post('media/upload', {
    command: 'APPEND',
    media_id: media_id,
    segment_index: segment_index,
    media: chunk_part
  }, function(err, data, response) {
    if (err) {
      console.log('ERROR ON APPEND:', err);
      process.exit(1);
    } else {
      //console.log('segment: ', segment_index, ' just added' );
      mediaFile.resume();
    }
  });
}

//Let's check the file size. Reading the API doc, it should not go over 15Mb.
if (mediaLength < maxFileSize) {
  //Let's do the Chunk as Twitter doc ask us : https://dev.twitter.com/rest/public/uploading-media#chunkedupload
  console.log('Initializing upload for a file size of :', mediaLength);
  T.post('media/upload', {
    'command': 'INIT',
    'media_type': mediaType,
    'total_bytes': mediaLength
  }, function(err, data, response) {
    console.log(data);
    if (err) {
      console.log('ERROR ON INIT:', err);
      process.exit(1);
    } else {
      let mediaTmpId = data.media_id_string;

      let chunkNumber = 0;
      /*let chunk;
      mediaFile.on('readable', function() {
          while ((chunk = mediaFile.read()) != null) {
              //data += chunk;
              append(mediaTmpId, chunk, chunkNumber);
              chunkNumber++;
          }
      });*/
      mediaFile.on('data', function(chunk) {
        mediaFile.pause();
        append(mediaTmpId, chunk, chunkNumber);
        chunkNumber++;
      });

      mediaFile.on('end', function() {
        finalize(mediaTmpId);
      });

      //-------------------------------------------
      //-------------------------------------------

      // chunker.on('chunkStart', function(id, done) {
      //   done();
      // });

      // chunker.on('chunkEnd', function(id, done) {
      //   finalize(mediaTmpId);
      //   done();
      // });

    // chunker.on('data', function(chunk) {
    //   console.log(chunk.length);
    //   append(mediaTmpId, chunk.data, chunkNumber);
    //   chunkNumber++;
    // });
    // mediaFile.pipe(chunker);
    }
  });
} else {
  console.log('ERROR: Sorry this file is too big');
}