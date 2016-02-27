var crypto  = require("crypto");
var oauth   = require("oauth");
var JSONToXml = require('jsontoxml');
var xml2js = require('xml2js');
var inflect = require('inflect');

var XERO_BASE_URL = 'https://api.xero.com';
var XERO_API_URL = XERO_BASE_URL + '/api.xro/2.0';

function Xero(key, secret, rsa_key, showXmlAttributes, customHeaders) {
    this.key = key;
    this.secret = secret;

    this.parser = new xml2js.Parser({explicitArray: false, ignoreAttrs: showXmlAttributes !== undefined ? (showXmlAttributes ? false : true) : true, async: true});
    this.oa = new oauth.OAuth(null, null, key, secret, '1.0', null, "PLAINTEXT", null, customHeaders);
    this.oa._signatureMethod = "RSA-SHA1"
    this.oa._createSignature = function(signatureBase, tokenSecret) {
        return crypto.createSign("RSA-SHA1").update(signatureBase).sign(rsa_key, output_format = "base64");
    }
}

Xero.prototype.call = function(method, path, body, callback) {
    var self = this;

    var post_body = null,
        json_body = {},
        content_type = null,
        rootPlural = null,
        rootSingular = null;
    if (method && method !== 'GET' && body) {
        if (Buffer.isBuffer(body)) {
            post_body = body;
        } else {
            rootPlural = path.match(/([^\/\?]+)/)[1];
            rootSingular = inflect.singularize(root);
            if (Array.isArray(body)) {
                json_body[rootPlural] = [];
                for (var i = 0; i < body.length; i++) {
                    json_body[rootPlural].push({
                       name:  rootSingular,
                       children: body[i]
                    });
                }
            }
            else {
                json_body[rootSingular] = body;
            }

            console.log('json_body ' + JSON.stringify(json_body));

            post_body = JSONToXml(json_body, {xmlHeader: true});

            console.log('post_body ' + post_body);

            content_type = 'application/xml';
        }
    }
    var process = function(err, xml, res) {
        if (err) {
            return callback(err);
        }

        self.parser.parseString(xml, function(err, json) {
            if (err) return callback(err);
            if (json && json.Response && json.Response.Status !== 'OK') {
                return callback(json, res);
            } else {
                return callback(null, json, res);
            }
        });
    };
    return self.oa._performSecureRequest(self.key, self.secret, method, XERO_API_URL + path, null, post_body, content_type, callback ? process : null);
}

module.exports = Xero;
