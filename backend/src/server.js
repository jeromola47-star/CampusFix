require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { seedBase } = require('./seed');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // creates tables on first start
    await seedBase();
    app.listen(PORT, () => console.log(`CampusFix API running on port ${PORT} (${sequelize.getDialect()})`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
