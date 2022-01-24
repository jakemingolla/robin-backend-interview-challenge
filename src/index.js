const API_PORT = 13778;

const main = async () => {
  const { log, db, app } = await require('./core');
  const { setupRoutes } = await require('./routes');

  setupRoutes(app);

  app.listen(API_PORT, () => {
    log.info(`robin-backend-interview API listening on port ${API_PORT}.`);
  });
};

return main().catch((err) => console.error(err));
