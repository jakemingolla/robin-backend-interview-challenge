const moment = require('moment');

const DEFAULT_INTERVAL_MINUTES = 15;
const DEFAULT_LIMIT = 5;

const availabilitiesModule = async () => {
  const { db, log } = await require('../core');

  const getAvailabilities = async (req, res) => {
    const start = moment(req.query.start);
    const end = moment(req.query.end);
    const userIds = (req.query.user_ids || []).map((x) => parseInt(x));
    const interval = req.query.interval_minutes
      ? parseInt(req.query.interval_minutes)
      : DEFAULT_INTERVAL_MINUTES;
    const limit = req.query.limit ? parseInt(req.query.limit) : DEFAULT_LIMIT;

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

    console.log('events length', events.length);

    const availabilities = [];

    let now = moment(start);
    let cutoff = now.add(interval, 'minutes');

    while (cutoff.isBefore(end) || availabilities.length >= limit) {}

    return res.status(200).json({ availabilities });
  };

  return { getAvailabilities };
};

module.exports = availabilitiesModule();
