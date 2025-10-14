const { Sequelize } = require('sequelize');
const config = require('../config');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
  logging: false
});

async function addYouTubeSimulcastColumns() {
  try {
    console.log('Adding YouTube simulcast columns to live_streams table...');
    
    // Add YouTube simulcast columns
    await sequelize.query(`
      ALTER TABLE live_streams 
      ADD COLUMN youtubeStreamId VARCHAR(255) NULL COMMENT 'YouTube live stream ID',
      ADD COLUMN youtubeBroadcastId VARCHAR(255) NULL COMMENT 'YouTube live broadcast ID',
      ADD COLUMN youtubeBroadcastUrl VARCHAR(500) NULL COMMENT 'YouTube live broadcast URL',
      ADD COLUMN youtubeRtmpUrl VARCHAR(500) NULL COMMENT 'YouTube RTMP stream URL'
    `);
    
    console.log('✅ YouTube simulcast columns added successfully!');
    console.log('Added columns:');
    console.log('- youtubeStreamId');
    console.log('- youtubeBroadcastId');
    console.log('- youtubeBroadcastUrl');
    console.log('- youtubeRtmpUrl');
    
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('⚠️  YouTube simulcast columns already exist in live_streams table');
    } else {
      console.error('❌ Error adding YouTube simulcast columns:', error);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addYouTubeSimulcastColumns();
