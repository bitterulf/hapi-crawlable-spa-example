'use strict';
const Inert = require('inert');
const Path = require('path');
const Hapi = require('hapi');
const config = require('./config.json');
const _ = require('lodash');

var bunyan = require('bunyan');
var Bunyan2Loggly = require('bunyan-loggly');
var logglyConfig = require('./config.json');
var logglyStream = new Bunyan2Loggly(logglyConfig);

const server = new Hapi.Server({
  load: { sampleInterval: 1000 },
  debug: {
      log: ['spa'],
      request: ['spa']
  },
  connections: {
    routes: {
      files: {
        relativeTo: Path.join(__dirname, 'public')
      }
    }
  }
});

server.connection({
  labels: ['api'],
  port: process.argv[2] || 4000
});

var logger = bunyan.createLogger({
    name: 'crawl-test',
    uri: server.info.uri,
    streams: [
        {
            type: 'raw',
            stream: logglyStream,
        },
    ],
});

server.register({
    register: require('hapi-crawlable-spa'),
    options: {
        cronTime: '0 * * * * *',
        wait: 5000,
        uri: process.argv[3]
    }
});

server.register(Inert, () => {});

server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: '.',
            redirectToSlash: true,
            index: true
        }
    }
});

server.on('log', function(data) {
    logger.info({keys: data.data.keys}, 'crawling');
});

server.on('response', (request) => {
    var source = '';
    if (_.isString(request.response.source)) {
        source = request.response.source;
    }

    logger.info({
        "user-agent": request.headers["user-agent"],
        url: request.url,
        path: request.path,
        method: request.method,
        source: source
    }, 'response');
});

server.start((err) => {
    if (err) {
        throw err;
    }

    logger.info('server start');
});

setInterval(function() {
    logger.info(server.load, 'load');
}, 60000);
