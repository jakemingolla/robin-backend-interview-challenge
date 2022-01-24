const bunyan = require('bunyan');
const { MongoClient } = require('mongodb');
const express = require('express');

const MONGO_CONNECTION_URL = 'mongodb://mongodb:27017';
const MONGO_DATABASE_NAME = 'robin';

const prepareCore = async () => {
  const log = bunyan.createLogger({
    name: 'robin-backend-interview-challenge',
    level: 'info',
  });

  log.info(`Attempting to connect to ${MONGO_CONNECTION_URL}`);
  const client = new MongoClient(MONGO_CONNECTION_URL);

  await client.connect();
  log.info('Mongo connection successful.');

  const db = client.db(MONGO_DATABASE_NAME);
  const app = express();

  return { log, db, app };
};

module.exports = prepareCore();
