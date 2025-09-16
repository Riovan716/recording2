module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recording',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  },
  media: {
    port: process.env.MEDIA_PORT || 8000,
    host: '0.0.0.0'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h'
  },
  upload: {
    path: './uploads',
    maxSize: 100 * 1024 * 1024 // 100MB
  }
}; 