'use strict';

var url = require('url');
var request = require('request');
var Mock = require('mockjs');
var qs = require('querystring');
var url = require('url');

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

        //路径支持前缀匹配
        if(!m){
            for(var key in opt.mock){
                if(parsed.pathname.indexOf(key) === 0){
                    m = opt.mock[key];
                    break;
                }
            }
        }

        var opts = null;

        if (m) {
            res.writeHead(200, {'Content-Type': 'application/json;charset=UTF-8'});
            //把所有参数都放到Mock.Random中用于占位符
            var extendObj = {};
            var query;

            if(req.method === "GET"){
                var url_parts = url.parse(req.url, true);
                query = url_parts.query;
            }else if (req.method == 'POST') {
                query = req.body;
            }

            for(var key in query){
                extendObj[key.toLowerCase()] = (function(key){
                    return function(){
                        return query[key]
                    };
                })(key)
            }

            Mock.Random.extend(extendObj)
            if(typeof m === 'function'){
                res.end(JSON.stringify(m(query)));
            }else{
                res.end(JSON.stringify(Mock.mock(m)));
            }
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
