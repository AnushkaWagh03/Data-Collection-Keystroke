const databaseName = process.env.MONGO_INITDB_DATABASE || 'keystroke-research';
const appUsername = process.env.MONGO_APP_USERNAME || 'keystroke_app';
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!appPassword) {
  throw new Error('MONGO_APP_PASSWORD is required for Mongo initialization');
}

const appDb = db.getSiblingDB(databaseName);

appDb.createUser({
  user: appUsername,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: databaseName }],
});
