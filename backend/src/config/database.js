// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('your_db_name', 'your_db_user', 'your_db_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false,
});

sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Error:', err));

module.exports = sequelize;
