const { Sequelize } = require("sequelize");
const env = require("./env");

const sequelize = env.databaseUrl
  ? new Sequelize(env.databaseUrl, {
      dialect: "postgres",
      logging: false,
    })
  : new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
      host: env.dbHost,
      port: env.dbPort,
      dialect: "postgres",
      logging: false,
    });

module.exports = sequelize;
