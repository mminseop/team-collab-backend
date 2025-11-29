import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'dbuser',  
  password: process.env.DB_PASSWORD || 'alstjq9965',
  database: process.env.DB_NAME || 'team_collab',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db;
