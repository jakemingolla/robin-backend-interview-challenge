const usersModule = async () => {
  const { db, log } = await require('../core');

  const upsertUser = (req, res) => {
    console.log('hellO!');

    return res.status(200).json({ message: 'yep' });
  };

  const getAllUsers = (req, res) => {
    console.log('hellO!');

    return res.json({ users: [] });
  };

  const deleteAllUsers = (req, res) => {
    console.log('hellO!');

    return res.json({ message: 'All users deleted.' });
  };

  return { upsertUser, getAllUsers, deleteAllUsers };
};

module.exports = usersModule();
