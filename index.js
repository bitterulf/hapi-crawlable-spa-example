'use strict';
const Inert = require('inert');
const Path = require('path');
const Hapi = require('hapi');

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
  port: 4000
});

server.register(Inert, () => {});

server.register({
    register: require('hapi-crawlable-spa'),
    options: {
        cronTime: '0 * * * * *',
        wait: 1000
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

    console.log(`server running at: ${server.info.uri}`);
});
