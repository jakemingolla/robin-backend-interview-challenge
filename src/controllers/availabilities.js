const moment = require('moment');
const difference = require('lodash.difference');
const getTimezoneOffset = require('get-timezone-offset');

const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_LIMIT = 5;
//const DEFAULT_LIMIT = 1;

/**
 * Determines if a given date is between the provided work hours
 * (in HH:mm format) using a IANA time zone offset. Working
 * hours are inclusive, meaning a date that is _exactly_ the
 * start or end is considered between.
 *
 * TODOs:
 * - Validate start < end
 * - Validate start/end formats are always HH:mm
 * - Validate IANA time zone values
 *
 * @param x {Moment-like} The date to test
 * @param start {String} The start of working hours in HH:mm format
 * @param end {String} The end of working hours in HH:mm format
 * @param timeZone {String} The IANA time zone value to use as an offset
 * @returns {Boolean}
 */
const isBetweenWorkingHours = (x, start, end, timeZone) => {
  const timeZoneOffsetMinutes = getTimezoneOffset(timeZone);

  // TODO This is a bit brittle and assumes the start or
  // end date are in the HH:mm format. If this data
  // is self-reported by the customer and/or not validated
  // by other means, it should be coerced here.
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

/**
 * Adds to the provided set of user IDs all users who
 * have a conflicting event with the given availability window
 * start and end. The end of the availability window is tested
 * on an inclusive basis and is allowed to end at the same time
 * an event starts.
 *
 * The set of disqualified user IDs is modified in-place.
 *
 * Future enhancements could include sorting the events
 * to ignore all events after the end of the given availability
 * window, but that would not change the worst case scenario.
 *
 * @param disqualifiedUserIds {Set<String>} A set of all user IDs
 *                                          disqualified from the given
 *                                          availability window.
 * @param events {Array<Event>} An array of all events for each user.
 *                              Each event _must_ be augmented with the
 *                              corresponding userId of its owner.
 * @param availabilityWindowStart {Moment} The start of the availability
 *                                         window under test.
 * @param availabilityWindowEnd {Moment} The end of the availability
 *                                         window under test.
 */
const disqualifyUsersByEvents = (
  disqualifiedUserIds,
  events,
  availabilityWindowStart,
  availabilityWindowEnd
) => {
  events.forEach((event) => {
    if (disqualifiedUserIds.has(event.userId)) {
      return;
    } else if (
      // NOTE: Inclusive to the event start, but exclusive
      // for all other calculations.
      availabilityWindowStart.isBetween(event.start, event.end, null, '[)') ||
      availabilityWindowEnd.isBetween(event.start, event.end, null, '[)')
    ) {
      disqualifiedUserIds.add(event.userId);
    }
  });
};

/**
 * Adds to the provided set of user IDs all users whose
 * working hours conflict with the provided availability window
 * start / end times.
 *
 * The set of disqualified user IDs is modified in-place.
 *
 * @see isBetweenWorkingHours
 * @param disqualifiedUserIds {Set<String>} A set of all user IDs
 *                                          disqualified from the given
 *                                          availability window.
 * @param users {Array<User>} A list of all users to test working hours.
 * @param availabilityWindowStart {Moment} The start of the availability
 *                                         window under test.
 * @param availabilityWindowEnd {Moment} The end of the availability
 *                                         window under test.
 */
const disqualifyUsersByWorkingHours = (
  disqualifiedUserIds,
  users,
  availabilityWindowStart,
  availabilityWindowEnd
) => {
  users.forEach((user) => {
    if (disqualifiedUserIds.has(user.user_id)) {
      return;
    }

    const workingHoursStart = user.working_hours.start;
    const workingHoursEnd = user.working_hours.end;
    const workingHoursTimeZone = user.working_hours.time_zone;

    if (
      !isBetweenWorkingHours(
        availabilityWindowStart,
        workingHoursStart,
        workingHoursEnd,
        workingHoursTimeZone
      ) ||
      !isBetweenWorkingHours(
        availabilityWindowEnd,
        workingHoursStart,
        workingHoursEnd,
        workingHoursTimeZone
      )
    ) {
      disqualifiedUserIds.add(user.user_id);
    }
  });
};

const availabilitiesModule = async () => {
  const { db, log } = await require('../core');

  // notes:
  // - minimum attendees as a replacement for user id enforcement
  // - if you could force full attendance than per-iteration work hours
  //   could be combined into a single check via pre-processing.

  /**
   * Finds all availability windows matching the provided query parameters
   * in the given request as a JSON response.
   *
   * NOTE: All parameters are assumed to come from querystring parameters
   *       or their configured default values.
   *
   * An availability window is as follows:
   *
   * - Every 'interval' minutes starting from the 'start' and ending
   *   with the 'end' timestamp enumerate all possible availability windows.
   *
   * - A user cannot be an attendee of an availability window if they have
   *   an event at the same time (accounting for time zone normalization to UTC).
   *
   * - A user cannot be an attendee of an availability window if it is
   *   outside of their defined working hours.
   *
   * - An availability window with fewer than the requested minimum attendees
   *   is discarded.
   *
   * All availability windows are sorted by the number of attendees, limited
   * to the requested number of entries (using a default value if not specified),
   * then returned to the user.
   *
   * TODOs (mostly validation):
   * - Check start timestamp < end timestamp
   * - Check interval (must be non-negative integer > 0, must be < total time)
   * - Check limit (must be non-negative integer > 0)
   * - Add a maximum time value to check start / end times. Current
   *   solution could easily be DOS'd via gigantic search ranges.
   */
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

    // Extract _all_ events for every user into a single
    // array for easier processing. Add the user_id of the
    // owner to each corresponding event object to assist
    // in the disqualification of users for availability windows.
    //
    // TODO: Unclear whether events are supposed to be unique
    // by 'id' property. If so, they could be de-duplicated here
    // and the owner could be instead a list of IDs.
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

    while (cutoff.isSameOrBefore(end)) {
      const disqualifiedUserIds = new Set();

      disqualifyUsersByEvents(disqualifiedUserIds, events, now, cutoff);
      disqualifyUsersByWorkingHours(disqualifiedUserIds, users, now, cutoff);

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
