'use strict';
const Inert = require('inert');
const Path = require('path');
const Hapi = require('hapi');
const config = require('./config.json');
const winston = require('winston');
require('winston-loggly-bulk');

const server = new Hapi.Server({
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

winston.add(winston.transports.Loggly, {
    token: config.token,
    subdomain: config.subdomain,
    tags: ['crawl-example', server.info.host+'_'+server.info.port],
    json:true
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

server.start((err) => {
    if (err) {
        throw err;
    }

    winston.log('info', `server running at: ${server.info.uri}`);
});
