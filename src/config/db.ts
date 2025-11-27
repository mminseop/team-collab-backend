import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

// 환경변수 검증 및 기본값 설정
const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'team_collab',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// MariaDB/MySQL 연결 풀 설정
const poolOptions: PoolOptions = {
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 연결 풀 생성
const db: Pool = mysql.createPool(poolOptions);

// 연결 테스트 함수
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// 기본 export
export default db;
