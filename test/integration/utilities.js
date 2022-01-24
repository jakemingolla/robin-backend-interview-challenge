const request = require('request-promise');

const BASE_URL = 'http://localhost:13778';
const USERS = require('../../data/user_data.json');

const makeAPIRequest = (method, path, body = null, query = null) => {
  const options = {
    method,
    uri: BASE_URL + path,
    json: true,
    simple: false,
    resolveWithFullResponse: true,
  };

  if (body) {
    options.body = body;
  }

  if (query) {
    options.qs = query;
  }

  return request(options);
};

const getAllUsers = async () => {
  return makeAPIRequest('GET', '/v1/users');
};

const createAllUsers = async () => {
  const promises = [];

  USERS.forEach((user) => {
    promises.push(makeAPIRequest('PUT', `/v1/users/${user.user_id}`, user));
  });

  return Promise.all(promises);
};

const deleteAllUsers = async () => {
  return makeAPIRequest('DELETE', '/v1/users');
};

const getAvailabilities = async (userIds, start, end, interval = null) => {
  const query = {
    user_ids: userIds,
    start,
    end,
  };

  console.log(query);

  if (interval) {
    query.interval = interval;
  }

  return makeAPIRequest('GET', '/v1/availabilities', null, query);
};

module.exports = {
  makeAPIRequest,
  getAllUsers,
  createAllUsers,
  deleteAllUsers,
  getAvailabilities,
  USERS,
};
