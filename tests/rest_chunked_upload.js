var assert = require('assert');
var fs = require('fs');
var mime = require('mime');
var path = require('path');

var config = require('../config1');
var Twit = require('../lib/twitter');

describe('twit.postMediaChunked', function () {
  it('Posting media via twit.postMediaChunked works with .mp4', function (done) {
    var twit = new Twit(config);
    var mediaFilePath = path.join(__dirname, './video/station.mp4');
    twit.postMediaChunked({ file_path: mediaFilePath }, function (err, bodyObj, resp) {
      exports.checkUploadMedia(err, bodyObj, resp)
      done()
    })
  })

  it('POST media/upload via manual commands works with .mp4', function (done) {
    var mediaFilePath = path.join(__dirname, './video/station.mp4');
    var mediaType = mime.lookup(mediaFilePath);
    var mediaFileSizeBytes = fs.statSync(mediaFilePath).size;

    var twit = new Twit(config);
    twit.post('media/upload', {
      'command': 'INIT',
      'media_type': mediaType,
      'total_bytes': mediaFileSizeBytes
    }, function (err, bodyObj, resp) {
      assert(!err, err);
      var mediaIdStr = bodyObj.media_id_string;

      var isStreamingFile = true;
      var isUploading = false;
      var segmentIndex = 0;
      var fStream = fs.createReadStream(mediaFilePath, { highWaterMark: 5 * 1024 * 1024 });

      var _finalizeMedia = function (mediaIdStr, cb) {
        twit.post('media/upload', {
          'command': 'FINALIZE',
          'media_id': mediaIdStr
        }, cb)
      }

      var _checkFinalizeResp = function (err, bodyObj, resp) {
        exports.checkUploadMedia(err, bodyObj, resp)
        done();
      }

      fStream.on('data', function (buff) {
        fStream.pause();
        isStreamingFile = false;
        isUploading = true;

        twit.post('media/upload', {
          'command': 'APPEND',
          'media_id': mediaIdStr,
          'segment_index': segmentIndex,
          'media': buff.toString('base64'),
        }, function (err, bodyObj, resp) {
          assert(!err, err);
          isUploading = false;

          if (!isStreamingFile) {
            _finalizeMedia(mediaIdStr, _checkFinalizeResp);
          }
        });
      });

      fStream.on('end', function () {
        isStreamingFile = false;

        if (!isUploading) {
          _finalizeMedia(mediaIdStr, _checkFinalizeResp);
        }
      });
    });
  })
})

exports.checkUploadMedia = function (err, bodyObj, resp) {
  assert(!err, err)

  assert(bodyObj)
  assert(bodyObj.media_id)
  assert(bodyObj.media_id_string)
  assert(bodyObj.size)
  assert(bodyObj.video)
  assert.equal(bodyObj.video.video_type, 'video/mp4')
}
