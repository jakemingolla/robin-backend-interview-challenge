const moment = require('moment');
const difference = require('lodash.difference');
const getTimezoneOffset = require('get-timezone-offset');

const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_LIMIT = 5;
//const DEFAULT_LIMIT = 1;

const isBetweenWorkingHours = (x, start, end, timeZone) => {
  const timeZoneOffsetMinutes = getTimezoneOffset(timeZone);

  // TODO brittle
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

const availabilitiesModule = async () => {
  const { db, log } = await require('../core');

  // todos:
  // - check start < end
  // - check interval (number + value)
  // - check limit (number + value)
  // - cache?
  //
  // notes:
  // - minimum attendees as a replacement for user id enforcement
  // - greedy algorithm --> can use minimum attendees as a stop-gap
  // - if you could force full attendance than per-iteration work hours
  //   could be combined into a single check via pre-processing.
  const getAvailabilities = async (req, res) => {
    const start = moment(req.query.start);
    const end = moment(req.query.end);
    const userIds = (req.query.user_ids || []).map((x) => parseInt(x));
    const interval = req.query.interval_minutes
      ? parseInt(req.query.interval_minutes)
      : DEFAULT_INTERVAL_MINUTES;
    const limit = req.query.limit ? parseInt(req.query.limit) : DEFAULT_LIMIT;
    const minimumAttendees = req.query.minimumAttendees
      ? parseInt(req.query.minimumAttendees)
      : 1;

    const users = await db
      .collection('users')
      .find({
        user_id: { $in: userIds },
      })
      .toArray();

    const events = users.reduce((events, user) => {
      return events.concat(
        user.events.map((event) => {
          event.userId = user.user_id;
          return event;
        })
      );
    }, []);

    let availabilities = [];

    let now = moment(start);
    let cutoff = now.clone().add(interval, 'minutes');
    let eventIndex = 0;

    while (cutoff.isSameOrBefore(end)) {
      const disqualifiedUserIds = new Set();

      events.forEach((event) => {
        if (disqualifiedUserIds.has(event.userId)) {
          return;
        } else if (
          // NOTE: Inclsive to the event start, but exclusive
          // for all other calculations.
          now.isBetween(event.start, event.end, null, '[)') ||
          cutoff.isBetween(event.start, event.end, null, '[)')
        ) {
          disqualifiedUserIds.add(event.userId);
        }
      });

      users.forEach((user) => {
        const workingHoursStart = user.working_hours.start;
        const workingHoursEnd = user.working_hours.end;
        const workingHoursTimeZone = user.working_hours.time_zone;

        if (
          !isBetweenWorkingHours(
            now,
            workingHoursStart,
            workingHoursEnd,
            workingHoursTimeZone
          ) ||
          !isBetweenWorkingHours(
            cutoff,
            workingHoursStart,
            workingHoursEnd,
            workingHoursTimeZone
          )
        ) {
          disqualifiedUserIds.add(user.user_id);
        }
      });

      const attendees = difference(
        userIds,
        Array.from(disqualifiedUserIds.values())
      );

      if (attendees.length >= minimumAttendees) {
        availabilities.push({
          attendees,
          startedAt: now.toISOString(),
          endedAt: cutoff.toISOString(),
        });
      }

      now = now.add(interval, 'minutes');
      cutoff = cutoff.add(interval, 'minutes');
    }

    availabilities = availabilities
      .sort((a, b) => {
        return a.attendees.length > b.attendees.length ? -1 : 1;
      })
      .slice(0, limit);

    return res.status(200).json({ availabilities });
  };

  return {
    getAvailabilities,
    __test: { isBetweenWorkingHours },
  };
};

module.exports = availabilitiesModule();
