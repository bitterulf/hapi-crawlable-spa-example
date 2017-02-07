'use strict';
const Inert = require('inert');
const Path = require('path');
const Hapi = require('hapi');
const config = require('./config.json');
const winston = require('winston');
require('winston-loggly-bulk');
const GoodWinston = require('good-winston');
const good = require('good');

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

server.register({
  register: good,
  options: {
    reporters:{
      winston: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{response: '*'}]
        },{
        module: 'good-winston',
        args:[winston, {
            error_level: 'error',
            // ops_level: 'info',
            // request_level:'info',
            response_level:'info',
            //other_level: 'info'
        }]
      }]
    }
}, function(err) {
  if (err) {
    return server.log(['error'], 'good load error: ' + err);
  }
}});

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
