const availabilitiesModule = async () => {
  const { db, log } = await require('../core');

  const getAvailabilities = (req, res) => {
    return res.status(200).json({
      availabilities: [],
    });
  };

  return { getAvailabilities };
};

module.exports = availabilitiesModule();
