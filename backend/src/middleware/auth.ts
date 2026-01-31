import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

export interface JwtPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export const signToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRE } as jwt.SignOptions
  );
};

/**
 * Middleware: проверяет JWT в заголовке Authorization (Bearer <token>)
 * и присоединяет пользователя к req.user.
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Требуется авторизация. Предоставьте токен.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден.' });
      return;
    }
    req.user = user;
    next();
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Недействительный токен' });
      return;
    }
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Срок действия токена истёк' });
      return;
    }
    next(err);
  }
};
