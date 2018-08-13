const request = require('request');
const socks = require('socksv5');

module.exports = function (config) {
  var proxyConfig = config.proxy;

  if (proxyConfig) {
    return request.defaults({
      agentClass: socks.HttpsAgent,
      agentOptions: {
        proxyHost: proxyConfig.host,
        proxyPort: proxyConfig.port,
        auths: [
          proxyConfig.auth ?
            socks.auth.UserPassword(proxyConfig.auth.username, proxyConfig.auth.password) :
            socks.auth.None()
        ]
      }
    });
  }

  return request;
};
