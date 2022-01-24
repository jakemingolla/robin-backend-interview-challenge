/*
 * Find times where all given users could meet
 * given user ids and a time range,
 * without considering working hours.
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

describe('challenge 1', () => {
  beforeEach(async () => {
    await deleteAllUsers();
    await createAllUsers();
  });

  afterEach(() => deleteAllUsers);

  it('can find times if no conflicts', async () => {
    const start = moment('1990-01-01T01:00:00').toISOString();
    const end = moment('1990-01-01T20:00:00').toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end);

    const { availabilities } = response.body;

    expect(availabilities.length).to.be.at.least(1);
    availabilities.forEach(({ startedAt, endedAt, attendees }) => {
      expect(attendees).to.deep.equal(userIds);
      expect(moment(startedAt).isSameOrAfter(start)).to.equal(true);
      expect(moment(endedAt).isSameOrBefore(end)).to.equal(true);
    });
  });

  it('can honor the minimum attendees rule', async () => {
    const start = moment('1990-01-01T01:00:00').toISOString();
    const end = moment('1990-01-01T20:00:00').toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end, {
      minimumAttendees: 42, // waaay too many
    });

    const { availabilities } = response.body;

    expect(availabilities.length).to.equal(0);
  });

  it('removes attendees with conflicts', async () => {
    const event = USERS[1].events[3];

    const start = moment(event.start).toISOString();
    const end = moment(event.end).toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end);

    const { availabilities } = response.body;
    const expectedAttendees = difference(userIds, [USERS[1].user_id]);

    expect(availabilities.length).to.be.at.least(1);
    availabilities.forEach(({ startedAt, endedAt, attendees }) => {
      expect(attendees).to.deep.equal(expectedAttendees);
      expect(moment(startedAt).isSameOrAfter(start)).to.equal(true);
      expect(moment(endedAt).isSameOrBefore(end)).to.equal(true);
    });
  });

  it('accounts for minimum attendees with conflicts', async () => {
    const event = USERS[0].events[0];

    const start = moment(event.start).toISOString();
    const end = moment(event.end).toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end, {
      minimumAttendees: userIds.length,
    });

    const { availabilities } = response.body;

    expect(availabilities.length).to.equal(0);
  });
});
