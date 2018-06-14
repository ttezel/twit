var assert = require('assert');
var fs = require('fs');
var mime = require('mime');
var util = require('util');

var MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
var MAX_FILE_CHUNK_BYTES = 5 * 1024 * 1024;

/**
 * FileUploader class used to upload a file to twitter via the /media/upload (chunked) API.
 * Usage:
 *   var fu = new FileUploader({ file_path: '/foo/bar/baz.mp4' }, twit);
 *   fu.upload(function (err, bodyObj, resp) {
 *     console.log(err, bodyObj);
 *   })
 *
 * @param  {Object}         params  Object of the form { file_path: String }.
 * @param  {Twit(object)}   twit    Twit instance.
 */
var FileUploader = function (params, twit) {
  assert(params)
  assert(params.file_path, 'Must specify `file_path` to upload a file. Got: ' + params.file_path + '.')
  var self = this;
  self._file_path = params.file_path;
  self._twit = twit;
  self._isUploading = false;
  self._isFileStreamEnded = false;
  self._isSharedMedia = !!params.shared;
}

/**
 * Upload a file to Twitter via the /media/upload (chunked) API.
 *
 * @param  {Function} cb function (err, data, resp)
 */
FileUploader.prototype.upload = function (cb) {
  var self = this;

  // Send INIT command with file info and get back a media_id_string we can use to APPEND chunks to it.
  self._initMedia(function (err, bodyObj, resp) {
    if (err) {
      cb(err);
      return;
    } else {
      var mediaTmpId = bodyObj.media_id_string;
      var chunkNumber = 0;
      var mediaFile = fs.createReadStream(self._file_path, { highWatermark: MAX_FILE_CHUNK_BYTES });

      mediaFile.on('data', function (chunk) {
        // Pause our file stream from emitting `data` events until the upload of this chunk completes.
        // Any data that becomes available will remain in the internal buffer.
        mediaFile.pause();
        self._isUploading = true;

        self._appendMedia(mediaTmpId, chunk.toString('base64'), chunkNumber, function (err, bodyObj, resp) {
          self._isUploading = false;
          if (err) {
            cb(err);
          } else {
            if (self._isUploadComplete()) {
              // We've hit the end of our stream; send FINALIZE command.
              self._finalizeMedia(mediaTmpId, cb);
            } else {
              // Tell our file stream to start emitting `data` events again.
              chunkNumber++;
              mediaFile.resume();
            }
          }
        });
      });

      mediaFile.on('end', function () {
        // Mark our file streaming complete, and if done, send FINALIZE command.
        self._isFileStreamEnded = true;
        if (self._isUploadComplete()) {
          self._finalizeMedia(mediaTmpId, cb);
        }
      });
    }
  })
}

FileUploader.prototype._isUploadComplete = function () {
  return !this._isUploading && this._isFileStreamEnded;
}

  /**
   * Send FINALIZE command for media object with id `media_id`.
   *
   * @param  {String}   media_id
   * @param  {Function} cb
   */
FileUploader.prototype._finalizeMedia = function(media_id, cb) {
  var self = this;
  self._twit.post('media/upload', {
    command: 'FINALIZE',
    media_id: media_id
  }, cb);
}

  /**
   * Send APPEND command for media object with id `media_id`.
   * Append the chunk to the media object, then resume streaming our mediaFile.
   *
   * @param  {String}   media_id        media_id_string received from Twitter after sending INIT comand.
   * @param  {String}   chunk_part      Base64-encoded String chunk of the media file.
   * @param  {Number}   segment_index   Index of the segment.
   * @param  {Function} cb
   */
FileUploader.prototype._appendMedia = function(media_id_string, chunk_part, segment_index, cb) {
  var self = this;
  self._twit.post('media/upload', {
    command: 'APPEND',
    media_id: media_id_string.toString(),
    segment_index: segment_index,
    media: chunk_part,
  }, cb);
}

/**
 * Send INIT command for our underlying media object.
 *
 * @param  {Function} cb
 */
FileUploader.prototype._initMedia = function (cb) {
  var self = this;
  var mediaType = mime.lookup(self._file_path);
  var mediaFileSizeBytes = fs.statSync(self._file_path).size;
  var shared = self._isSharedMedia;
  var media_category = 'tweet_image';

  if (mediaType.toLowerCase().indexOf('gif') > -1) {
    media_category = 'tweet_gif';
  } else if (mediaType.toLowerCase().indexOf('video') > -1) {
    media_category = 'tweet_video';
  }

  // Check the file size - it should not go over 15MB for video.
  // See https://dev.twitter.com/rest/reference/post/media/upload-chunked
  if (mediaFileSizeBytes < MAX_FILE_SIZE_BYTES) {
    self._twit.post('media/upload', {
      'command': 'INIT',
      'media_type': mediaType,
      'total_bytes': mediaFileSizeBytes,
      'shared': shared,
      'media_category': media_category
    }, cb);
  } else {
    var errMsg = util.format('This file is too large. Max size is %dB. Got: %dB.', MAX_FILE_SIZE_BYTES, mediaFileSizeBytes);
    cb(new Error(errMsg));
  }
}

module.exports = FileUploader
