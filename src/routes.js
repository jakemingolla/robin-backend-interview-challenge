const routesModule = async () => {
  const availabilitiesController =
    await require('./controllers/availabilities');
  const usersController = await require('./controllers/users');

  const setupRoutes = (app) => {
    app.get('/v1/availabilities', availabilitiesController.getAvailabilities);

    app.get('/v1/users', usersController.getAllUsers);
    app.put('/v1/users/:userId', usersController.upsertUser);
    app.delete('/v1/users', usersController.deleteAllUsers);

    app.get('/ping', (req, res) => {
      return res.status(200).json({ message: 'Hello!' });
    });

    app.use((req, res) => {
      return res.status(404).json({ message: 'No matching route.' });
    });
  };

  return { setupRoutes };
};

module.exports = routesModule();
