var assert = require('assert');
var fs = require('fs');
var mime = require('mime');
var util = require('util');
var request = require('http');
var fileType = require('file-type');

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
 *   var request = require('request')
 *   var stream = request('http://www.domain.com/file_to_upload.ext')
 *   var fu = new FileUploader({ file_stream: stream }, twit);
 *   fu.upload(function (err, bodyObj, resp) {
 *     console.log(err, bodyObj);
 *   })
 *
 * @param  {Object}         params  Object of the form { file_path: String } or { file_strea: ReadableStream }
 * @param  {Twit(object)}   twit    Twit instance.
 */
var FileUploader = function (params, twit) {
  assert(params)
  assert(params.file_path || params.file_stream, 'Must specify `file_path` or `file_stream` to upload a file.')
  var self = this;
  self._file_path = params.file_path;
  self._file_stream = params.file_stream;
  self._remoteUpload = self._file_stream ? true : false;
  self._twit = twit;
  self._isUploading = false;
  self._isFileStreamEnded = false;

  if (self._remoteUpload) {self._file_stream.pause();}
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
      var mediaFile = self._file_stream || fs.createReadStream(self._file_path, { highWatermark: MAX_FILE_CHUNK_BYTES });

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
      mediaFile.resume();
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

FileUploader.prototype._getFileInfoForUpload = function(cb) {
  var self = this;

  if (self._remoteUpload === true) {

    request.get(self._file_stream.uri.href, function(res){
      res.once('data', function(chunk){

        var len = res.headers['content-length']
        if (!len) {
          return cb(new Error('Unable to determine file size'))
        }
        len = +len
        if (len !== len) {
          return cb(new Error('Invalid Content-Length received'))
        }

        var mediaFileSizeBytes = +res.headers['content-length']
        var mediaType = fileType(chunk)["mime"];

        cb(null, mediaType, mediaFileSizeBytes);
        res.destroy();
      });
    });
  }
  else {
    var mediaType = mime.lookup(self._file_path);
    var mediaFileSizeBytes = fs.statSync(self._file_path).size;
    cb(null, mediaType, mediaFileSizeBytes);
  }
}

/**
 * Send INIT command for our underlying media object.
 *
 * @param  {Function} cb
 */
FileUploader.prototype._initMedia = function (cb) {
  var self = this;

  self._getFileInfoForUpload(function(err, mediaType, mediaFileSizeBytes){

    // Check the file size - it should not go over 15MB for video.
    // See https://dev.twitter.com/rest/reference/post/media/upload-chunked
    if (mediaFileSizeBytes < MAX_FILE_SIZE_BYTES) {
      self._twit.post('media/upload', {
        'command': 'INIT',
        'media_type': mediaType,
        'total_bytes': mediaFileSizeBytes
      }, cb);
    } else {
      var errMsg = util.format('This file is too large. Max size is %dB. Got: %dB.', MAX_FILE_SIZE_BYTES, mediaFileSizeBytes);
      cb(new Error(errMsg));
    }
  });
}

module.exports = FileUploader
