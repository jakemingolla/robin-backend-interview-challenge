const moment = require('moment');
const difference = require('lodash.difference');

const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_LIMIT = 5;
//const DEFAULT_LIMIT = 1;

const availabilitiesModule = async () => {
  const { db, log } = await require('../core');

  // todos:
  // - check start < end
  // - check interval (number + value)
  // - check limit (number + value)
  //
  // notes:
  // - minimum attendees as a replacement for user id enforcement
  // - greedy algorithm --> can use minimum attendees as a stop-gap
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
      : -1;

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

    const availabilities = [];

    let now = moment(start);
    let cutoff = now.clone().add(interval, 'minutes');
    let eventIndex = 0;
    let disqualifiedUserIds = new Set();

    while (cutoff.isBefore(end) && availabilities.length < limit) {
      let event = events[eventIndex];

      while (
        now.isBetween(event.start, event.end, '[]') ||
        cutoff.isBetween(event.start, event.end, '[]')
      ) {
        disqualifiedUserIds.add(event.userId);

        eventIndex += 1;

        if (eventIndex > events.length) {
          break;
        } else {
          event = event[eventIndex];
        }
      }

      const attendees = difference(userIds, disqualifiedUserIds.entries());

      /*
      console.log('now', now);
      console.log('cutoff', cutoff);
      console.log('disqualified', disqualifiedUserIds.entries());
      console.log('attendees', attendees);
      */

      if (minimumAttendees === -1 || attendees.length >= minimumAttendees) {
        availabilities.push({
          attendees,
          startedAt: now.toISOString(),
          endedAt: cutoff.toISOString(),
        });
      }

      now = now.add(interval, 'minutes');
      cutoff = cutoff.add(interval, 'minutes');
    }

    return res.status(200).json({ availabilities });
  };

  return { getAvailabilities };
};

module.exports = availabilitiesModule();
