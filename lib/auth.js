//
//  OAuth authentication class
//
var oauth = require('oauth')

var required = [
    'oauth_request_url'
    , 'oauth_access_url'
    , 'consumer_key'
    , 'consumer_secret'
    , 'access_token'
    , 'access_token_secret'
];
var required_app_only_auth = [
    'oauth_request_url'
    , 'oauth_access_url'
];

//
//  OAuth Authentication Object
//
function Auth(config) {
    var setupAppOnlyAuth = function () {
        required_app_only_auth.forEach(function (requirement) {
            if (!config[requirement])
                throw new Error('config must provide ' + requirement)
        });
        this.oa = new oauth.OAuth2(config.consumer_key
            , config.consumer_secret
            , 'https://api.twitter.com/'
            , null
            , 'oauth2/token'
            , null);
        this.refreshAccessToken = function () {
            var that = this;
            this.oa.getOAuthAccessToken(
                '',
                {'grant_type': 'client_credentials'},
                function (e, access_token, refresh_token, results) {
                    that.access_token = access_token;
                }
            );

        };
        this.refreshAccessToken();

        that = this;
        this.get = function(path,cb) {
            return that.oa.get(
                path
                , that.access_token
                , cb
            )
        }
    };

    var setupUserAuth = function () {
        required.forEach(function (requirement) {
            if (!config[requirement])
                throw new Error('config must provide ' + requirement)
        });
        this.oa = new oauth.OAuth(
            config.oauth_request_url
            , config.oauth_access_url
            , config.consumer_key
            , config.consumer_secret
            , '1.0'
            , null
            , 'HMAC-SHA1'
        );
        that = this;
        this.get = function(path,cb) {
            return that.oa.get(
                path
                , that.config.access_token
                , that.config.access_token_secret
                , cb
            )
        }
    };


    //check config for proper format
    if (typeof config !== 'object')
        throw new TypeError('config must be object, got ' + typeof config)

    if (!config.app_only_auth) {
        setupUserAuth.apply(this);
    } else {
        setupAppOnlyAuth.apply(this);
    }
    //assign config
    this.config = config;


}

module.exports = Auth

