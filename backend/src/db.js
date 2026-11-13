require('dotenv').config();
const { Sequelize } = require('sequelize');

let sequelize;
if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'test' ? ':memory:' : process.env.SQLITE_FILE || 'database.sqlite',
    logging: false,
  });
}

const isPostgres = sequelize.getDialect() === 'postgres';
module.exports = { sequelize, isPostgres };
