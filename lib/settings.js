// set of status codes where we don't attempt reconnecting to Twitter
exports.STATUS_CODES_TO_ABORT_ON = [ 400, 401, 403, 404, 406, 410, 422 ];