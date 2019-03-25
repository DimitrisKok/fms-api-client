'use strict';

const { log, store } = require('./services');

let data = {};

//#client-providers-example
const providers = client =>
  client.providers().then(result => log('client-providers-example', result));
//#

//#client-update-credentials-example
const updateCredentials = client => client.connection.credentials.update(data);
//#

const openAuth = client =>
  Promise.all([providers(client), updateCredentials(client)]).then(
    responses => {
      store(responses);
      return client;
    }
  );

module.exports = { openAuth };