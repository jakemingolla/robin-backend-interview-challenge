/*
 * Find each 15 minute block where users could meet
 * given user ids and a time range,
 * within their working hours and order the results
 * by number of users who can attend.
 *
 * For example, users 1, 2, and 3 can meet
 * for the 09:00 - 09:15 block whereas
 * only users 2 and 3 can meet for the 09:15 - 09:30 block.
 *
 * Bonus: Make the interval dynamic
 *        (you can pass it through as an API parameter).
 */
const { expect } = require('chai');
const moment = require('moment');
const difference = require('lodash.difference');

const {
  createAllUsers,
  deleteAllUsers,
  getAllUsers,
  getAvailabilities,
  USERS,
} = require('./utilities');

describe('challenge 3', () => {
  beforeEach(async () => {
    await deleteAllUsers();
    await createAllUsers();
  });

  afterEach(() => deleteAllUsers);

  it('sorts the availability blocks by attendees', async () => {
    // NOTE: The example given the README is incorrect.
    // User 3 canot work at 9 AM eastern as that is outside of their
    // working hours.

    // 3:15 PM eastern
    const start = moment('2019-01-01T15:15:00-0500').toISOString();
    // 4:00 PM eastern
    const end = moment('2019-01-01T16:00:00-0500').toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end);

    const { availabilities } = response.body;

    expect(availabilities.length).to.equal(3);

    // All can work at 3:45 PM eastern for 15 minutes.
    expect(availabilities[0].attendees).to.deep.equal([1, 2, 3]);

    // Only 1 and 2 can work at 3:30 PM eastern for 15 minutes.
    expect(availabilities[1].attendees).to.deep.equal([1, 2]);

    // Only 2 can meet at 3:15 PM for 15 minutes.
    expect(availabilities[2].attendees).to.deep.equal([2]);
  });

  it('can alter the interval dynamically', async () => {
    // 3:15 PM eastern
    const start = moment('2019-01-01T15:15:00-0500').toISOString();
    // 4:00 PM eastern
    const end = moment('2019-01-01T16:00:00-0500').toISOString();
    const userIds = USERS.map((x) => x.user_id);
    const intervalMinutes = 30;

    const response = await getAvailabilities(userIds, start, end, {
      interval_minutes: intervalMinutes,
    });

    const { availabilities } = response.body;

    // Only one availability window if the interval is adjusted
    expect(availabilities.length).to.equal(1);
  });
});
