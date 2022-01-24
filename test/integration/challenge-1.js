/*
 * Find times where all given users could meet
 * given user ids and a time range,
 * without considering working hours.
 */
const moment = require('moment');

const {
  createAllUsers,
  deleteAllUsers,
  getAllUsers,
  getAvailabilities,
  USERS,
} = require('./utilities');

describe('challenge 1', () => {
  beforeEach(async () => {
    await deleteAllUsers();
    await createAllUsers();
  });

  //afterEach(() => deleteAllUsers);

  it.only('can find times if no conflicts', async () => {
    const start = moment('1990-01-01T01:00:00').toISOString();
    const end = moment('1990-01-01T02:00:00').toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end);

    console.log(response.body);
  });
});
