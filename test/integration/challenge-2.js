/*
 * Find times where all given users could meet
 * given user ids and a time range,
 * within their working hours.
 */

const { expect } = require('chai');
const moment = require('moment');
const difference = require('lodash.difference');
const getTimezoneOffset = require('get-timezone-offset');

const {
  createAllUsers,
  deleteAllUsers,
  getAllUsers,
  getAvailabilities,
  USERS,
} = require('./utilities');

const isBetweenWorkingHours = (x, start, end, timeZone) => {
  const timeZoneOffsetMinutes = getTimezoneOffset(timeZone);

  const startHours = parseInt(start.split(':')[0]);
  const startMinutes = parseInt(start.split(':')[1]);
  const endHours = parseInt(end.split(':')[0]);
  const endMinutes = parseInt(end.split(':')[1]);

  const cutoffStart = moment(x)
    .clone()
    .startOf('day')
    .add(startHours, 'hours')
    .add(startMinutes, 'minutes')
    .add(timeZoneOffsetMinutes, 'minutes');

  const cutoffEnd = moment(x)
    .clone()
    .startOf('day')
    .add(endHours, 'hours')
    .add(endMinutes, 'minutes')
    .add(timeZoneOffsetMinutes, 'minutes');

  return (
    moment(x).isSameOrAfter(cutoffStart) && moment(x).isSameOrBefore(cutoffEnd)
  );
};

/*
const yes = moment('1970-01-01T20:00:00');
const no = moment('1970-01-01T04:00:00');
const start = '09:00';
const end = '17:00';
const timeZone = 'America/New_York';

const foo = isBetweenWorkingHours(no, start, end, timeZone);
console.log('should be false', foo);

const bar = isBetweenWorkingHours(yes, start, end, timeZone);
console.log('should be true', bar);
*/

describe('challenge 2', () => {
  beforeEach(async () => {
    await deleteAllUsers();
    await createAllUsers();
  });

  afterEach(() => deleteAllUsers);

  it('can find times within hours if no conflicts', async () => {
    const start = moment('1990-01-01T01:00:00').toISOString();
    const end = moment('1990-01-01T20:00:00').toISOString();
    const userIds = USERS.map((x) => x.user_id);

    const response = await getAvailabilities(userIds, start, end, {
      minimumAttendees: 3,
    });
    const { availabilities } = response.body;

    expect(availabilities.length).to.be.at.least(1);
    availabilities.forEach(({ startedAt, endedAt, attendees }) => {
      expect(attendees).to.deep.equal(userIds);

      expect(moment(startedAt).isSameOrAfter(start)).to.equal(true);
      expect(moment(endedAt).isSameOrBefore(end)).to.equal(true);

      USERS.forEach((user) => {
        const workingHoursStart = user.working_hours.start;
        const workingHoursEnd = user.working_hours.end;
        const workingHoursTimeZone = user.working_hours.time_zone;

        expect(
          isBetweenWorkingHours(
            startedAt,
            workingHoursStart,
            workingHoursEnd,
            workingHoursTimeZone
          )
        ).to.equal(
          true,
          `User ${user.user_id} ` +
            `with working hours ${workingHoursStart} to ` +
            `${workingHoursEnd} in ${workingHoursTimeZone} ` +
            `cannot meet at ${startedAt}`
        );
        expect(
          isBetweenWorkingHours(
            endedAt,
            workingHoursStart,
            workingHoursEnd,
            workingHoursTimeZone
          )
        ).to.equal(
          true,
          `User ${user.user_id} ` +
            `with working hours ${workingHoursStart} to ` +
            `${workingHoursEnd} in ${workingHoursTimeZone} ` +
            `cannot meet at ${endedAt}`
        );
      });
    });
  });
});
