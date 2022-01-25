const moment = require('moment');
const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();

// TODO actually mock out the DB and log dependencies,
// but since we aren't testing any of the controller functionality
// it's not needed.
const mockCore = async () => {
  return;
};

describe('src/controllers/availabilities', () => {
  describe('isBetweenWorkingHours', () => {
    let isBetweenWorkingHours;

    // For all tests below, these will be the working hours (9 - 5 Eastern)
    const start = '09:00';
    const end = '17:00';
    const timeZone = 'America/New_York';

    before(async () => {
      const moduleUnderTest = await proxyquire(
        '../../../src/controllers/availabilities',
        {
          '../core': mockCore,
        }
      );

      ({ isBetweenWorkingHours } = moduleUnderTest.__test);
    });

    it('returns true if a value is between working hours', () => {
      // 10 AM eastern
      const value = moment('2022-01-01T15:00:00');

      expect(isBetweenWorkingHours(value, start, end, timeZone)).to.equal(true);
    });

    it('returns true if a value is exactly the start of working hours', () => {
      // 9 AM eastern
      const value = moment('2022-01-01T14:00:00');

      expect(isBetweenWorkingHours(value, start, end, timeZone)).to.equal(true);
    });

    it('returns true if a value is exactly the end of working hours', () => {
      // 5 PM eastern
      const value = moment('2022-01-01T22:00:00');

      expect(isBetweenWorkingHours(value, start, end, timeZone)).to.equal(true);
    });

    it('returns false if a value is before working hours', () => {
      // 8:59 AM eastern
      const value = moment('2022-01-01T13:59:00');

      expect(isBetweenWorkingHours(value, start, end, timeZone)).to.equal(
        false
      );
    });

    it('returns false if a value is after working hours', () => {
      // 5:01 PM eastern
      const value = moment('2022-01-01T22:01:00');

      expect(isBetweenWorkingHours(value, start, end, timeZone)).to.equal(
        false
      );
    });
  });
});
