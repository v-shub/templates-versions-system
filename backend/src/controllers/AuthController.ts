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

/**
 * PATCH /auth/me
 * Обновление профиля текущего пользователя (name, email).
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    const { name, email } = req.body;

    const updates: { name?: string; email?: string } = {};
    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof email === 'string' && email.trim()) {
      const newEmail = email.trim().toLowerCase();
      if (newEmail !== req.user.email) {
        const existing = await User.findOne({ email: newEmail });
        if (existing) {
          res.status(400).json({ error: 'Пользователь с таким email уже существует' });
          return;
        }
        updates.email = newEmail;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'Не указаны поля для обновления (name, email)' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
};

/**
 * POST /auth/me/password
 * Смена пароля текущего пользователя.
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Требуется авторизация' });
      return;
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Необходимы currentPassword и newPassword' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
      return;
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ error: 'Неверный текущий пароль' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Ошибка при смене пароля' });
  }
};
