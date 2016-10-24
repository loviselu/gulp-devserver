'use strict';

var url = require('url');
var request = require('request');
var Mock = require('mockjs');

var utils = require('./utils');

function iProxy(opt) {
    // 是否需要代理此接口
    var proxyUrls = utils.isArray(opt.urls) ? opt.urls : [opt.urls];
    var isProxy = function(u) {
        return proxyUrls.some(function(proxyUrl) {
            return utils.isRegExp(proxyUrl) ? proxyUrl.test(u) : proxyUrl === u;
        });
    };
    return function(req, res, next) {
        var parsed = url.parse(req.url);
        var m = opt.mock[parsed.pathname];
        var opts = null;
        if (m) {
            res.end(Mock.mock(m));
        } else if (opt.host && isProxy(parsed.pathname)) {
            req.headers['Host'] = opt.host.replace(/^https?:\/\//, '');
            opts = {
                method: req.method,
                url: opt.host + parsed.path,
                headers: req.headers
            };
            if (req.body && Object.keys(req.body).length) {
                opts.form = req.body;
            }
            
            request(opts).pipe(res);
            
            // var requestBody = '';
            // req.on('data', function(chunk) {
            //     requestBody += chunk;
            // }).on('end', function() {
            //     request(opts).pipe(res);
            // });
        } else {
            next();
        }
    };
};

module.exports = iProxy;
