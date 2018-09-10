'use strict';

const _ = require('lodash');

/**
 * @method toArray
 * @description The toArray method converts an object into an array. This method uses the object prototype method
 * isArray to check if the incoming data is an array. If the incoming data is not an array this method will
 * return the data in an array
 * @param  {Object|Array} data An array or object containing query information. This can be an array or an object.
 * @return {Object}      An array containing the data passed to the method.
 */

const toArray = data => (Array.isArray(data) ? data : [data]);

/**
 * @method namespace
 * @description The namespace method maps through an incoming data object's keys and replaces the properties
 * of limit, offset, and sort with their _ counterparts.
 * @param  {Object} data An object used in a DAPI query.
 * @return {Object}      A modified object containing modified keys to match expected properties
 */

const namespace = data =>
  _.mapKeys(
    data,
    (value, key) =>
      _.includes(['limit', 'offset', 'sort'], key) ? `_${key}` : key
  );

/**
 * @method isJson
 * @description The isJson method uses the a try / catch to parse incoming data safely as json.
 * This method will return tru if it is able to cast the incoming data as json.
 * @param  {Any} data The data to be evaluated as json.
 * @return {Boolean}      A boolean result depending on if the data passed to it is valid JSON
 */

const isJson = data => {
  try {
    JSON.parse(data);
  } catch (e) {
    return false;
  }
  return true;
};

/**
 * @method stringify
 * @description stringify is a helper method that converts numbers, objects, and arrays to strings.
 * @param  {Object|Array} data The data being used to create or update a record.
 * @return {Object}      a json object containing stringified data.
 */

const stringify = data =>
  _.mapValues(
    data,
    value =>
      typeof value === 'string'
        ? value
        : typeof value === 'object' ? JSON.stringify(value) : value.toString()
  );

/**
 * @method filterResponse
 * @description This method filters the FileMaker DAPI response by testing if a script was triggered
 * with the request, then either selecting the response, script error, and script result from the
 * response or selecting just the response.
 * @param  {Object} data The response recieved from the FileMaker DAPI.
 * @return {Object}      A json object containing the selected data from the Data API Response.
 */

const filterResponse = data =>
  _.mapValues(
    data.response,
    value => (isJson(value) ? JSON.parse(value) : value)
  );

/**
 * @method sanitizeParameters
 * @description The santizeParameters method filters unsafe parameters from its return object based
 * on the safeOarameters array that is passed to it. This method is currently used in the client.create
 * method to seperate the merge option from the paramaters that are safe to send to FileMaker.
 * @param {Object} parameters An array values being passed to the FileMaker DAPI.
 * @param {Array} safeParameters An array values allowed to be sent to filemaker.
 * @return {Object|Array} returns an object or array of objects with only allowed keys
 * and values mapped to strings.
 */

const sanitizeParameters = (parameters, safeParameters) =>
  safeParameters
    ? _.mapValues(
        _.pickBy(
          convertParameters(parameters),
          (value, key) =>
            _.includes(safeParameters, key) ||
            (_.includes(safeParameters, '_offset.*') &&
              _.startsWith(key, '_offset.')) ||
            (_.includes(safeParameters, '_limit.*') &&
              _.startsWith(key, '_limit.')) ||
            (_.includes(safeParameters, 'offset.*') &&
              _.startsWith(key, 'offset.')) ||
            (_.includes(safeParameters, 'limit.*') &&
              _.startsWith(key, 'limit.'))
        ),
        value => (_.isNumber(value) ? value.toString() : value)
      )
    : _.mapValues(
        convertParameters(parameters),
        value => (_.isNumber(value) ? value.toString() : value)
      );

/**
 * @method convertScripts
 * @description The converScript method abstracts the lodash map method to reduce the number of imports required
 * for each model. This method accepts an array and a method to use when mapping the array of values.
 * @param  {Object} data The data to use when invoking the method
 * @return {Object}      A new object based on the assignment of incoming properties.
 */

const convertScripts = data => {
  let { scripts } = data;
  let converted = Array.isArray(scripts)
    ? _.chain(scripts)
        .map(script =>
          _.mapKeys(
            script,
            (value, key) =>
              !_.isEmpty(script.phase)
                ? key === 'name'
                  ? `script.${script.phase}`
                  : `script.${script.phase}.${key}`
                : key === 'name' ? `script` : `script.${key}`
          )
        )
        .map(script => _.omitBy(script, (value, key) => key.includes('.phase')))
        .value()
    : [];
  return Object.assign({}, ...converted);
};

/**
 * @method convertPortals
 * @description The convertPortals method converts a request containing a portal array into the syntax
 * supported by the filemaker data api.
 * @param  {Object|Array} data The data to use when invoking the method
 * @return {Object}      A new object with the FileMaker required parameters for portals.
 */

const convertPortals = data => {
  let portalArray = [];
  let { portals } = data;
  let converted = Array.isArray(portals)
    ? _.chain(portals)
        .map(portal =>
          _.mapKeys(
            portal,
            (value, key) =>
              key === 'limit'
                ? `limit.${portal.name}`
                : key === 'offset'
                  ? `offset.${portal.name}`
                  : key === 'name' ? portalArray.push(value) : `remove`
          )
        )
        .map(portal => _.omitBy(portal, (value, key) => key.includes('remove')))
        .value()
    : [];
  return Object.assign({ portals: portalArray }, converted);
};

/**
 * @function omit
 * @public
 * @description fieldData is a helper method that strips the filemaker structural layout and portal information
 * from a record. It returns only the data contained in the fieldData key and the recordId.
 * @deprecated since version 1.5.0. Use the exported module instead.
 * @param  {Object|Array} data The raw data to use when omitting. his can be an array or an object.
 * @param  {Array} properties An array properties to remove.
 * @return {Object|Array} A json object or array of objects without the properties passed to it
 */

const omit = (data, properties) =>
  Array.isArray(data)
    ? _.map(data, object => _.omit(object, properties))
    : _.omit(data, properties);

/**
 * @function convertParameters
 * @public
 * @description Handles converting portals and scripts from array based parameters to object key based
 * parameters to FileMaker required parameters.
 * @param  {Object|Array} data The raw data to use converting parameters
 * @return {Object|Array} A json object or array of objects without the properties passed to it
 */

const convertParameters = data =>
  Object.assign(convertPortals(data), stringify(convertScripts(data)), data);

/**
 * @function fieldData
 * @public
 * @description fieldData is a helper method that strips the filemaker structural layout and portal information
 * from a record. It returns only the data contained in the fieldData key and the recordId.
 * @deprecated since version 1.5.0. Use the exported module instead.
 * @param  {Object|Array} data The raw data returned from a filemaker. This can be an array or an object.
 * @return {Object|Array} A json object containing fieldData from the record.
 */

const fieldData = data =>
  Array.isArray(data)
    ? _.map(data, object =>
        Object.assign({}, object.fieldData, {
          recordId: object.recordId,
          modId: object.modId
        })
      )
    : Object.assign(data.fieldData, {
        recordId: data.recordId,
        modId: data.modId
      });

/**
 * @function recordId
 * @public
 * @description returns record ids for the data parameters passed to it. This can be an array of ids or an object.
 * from a record. It returns only the data contained in the fieldData key adn the recordId.
 * @param  {Object|Array} data the raw data returned from a filemaker. This can be an array or an object.
 * @return {Object}      a json object containing fieldData from the record.
 */

const recordId = data =>
  Array.isArray(data)
    ? _.map(data, object => object.recordId)
    : data.recordId.toString();

/**
 * @module fieldData
 * @module omit
 * @module recordId
 * @module toArray
 * @module namespace
 * @module isJson
 * @module stringify
 * @module filterResponse
 * @module sanitizeParameters
 */

module.exports = {
  fieldData,
  omit,
  recordId,
  toArray,
  namespace,
  isJson,
  stringify,
  filterResponse,
  sanitizeParameters
};
