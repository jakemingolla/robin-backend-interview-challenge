const usersModule = async () => {
  const { db, log } = await require('../core');

  const upsertUser = async (req, res) => {
    const user = req.body;
    const { user_id } = user;

    const result = await db
      .collection('users')
      .replaceOne({ user_id }, user, { upsert: true });

    return res.status(result.upsertedCount === 1 ? 201 : 200).json(user);
  };

  const getAllUsers = async (req, res) => {
    const query = await db.collection('users').find({}).project({ _id: 0 });
    const users = await query.toArray();

    return res.status(200).json({ users });
  };

  const deleteAllUsers = async (req, res) => {
    await db.collection('users').deleteMany({}, { multi: true });

    return res.status(200).json({ message: 'All users deleted.' });
  };

  return { upsertUser, getAllUsers, deleteAllUsers };
};

module.exports = usersModule();
