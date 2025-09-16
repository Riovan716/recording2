const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const Recording = sequelize.define('Recording', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  judul: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'recordings',
  timestamps: false,
});

module.exports = Recording; 