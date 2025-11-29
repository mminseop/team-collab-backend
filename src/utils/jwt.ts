import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'teamcollab-super-secret-key-change-production';
const ACCESS_TOKEN_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: number;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  departmentId: number | null;
}

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRES_IN 
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
