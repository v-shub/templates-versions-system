import { Request, Response } from 'express';
import User from '../models/User';
import { signToken, AuthRequest } from '../middleware/auth';

/**
 * POST /auth/register
 * Регистрация: email, password, name -> создание пользователя и возврат токена.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({
        error: 'Необходимы поля: email, password, name',
      });
      return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        error: 'Пароль должен быть не менее 6 символов',
      });
      return;
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      return;
    }

    const user = await User.create({
      email: email.trim().toLowerCase(),
      password,
      name: (name || '').trim(),
    });

    const token = signToken(user._id.toString());
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
};

/**
 * POST /auth/login
 * Вход: email, password -> проверка пароля и возврат токена.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Необходимы email и password' });
      return;
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = signToken(user._id.toString());
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
};

/**
 * GET /auth/me
 * Текущий пользователь (требует токен).
 */
export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
      },
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
};
