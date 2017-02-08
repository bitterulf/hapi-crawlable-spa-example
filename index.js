'use strict';
const Inert = require('inert');
const Path = require('path');
const Hapi = require('hapi');
const config = require('./config.json');

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

server.register(Inert, () => {});

server.register({
    register: require('hapi-crawlable-spa'),
    options: {
        cronTime: '0 * * * * *',
        wait: 5000,
        uri: process.argv[3]
    }
});

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
    logger.info({"user-agent": request.headers["user-agent"], path: request.path,  method: request.method}, 'response');
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
