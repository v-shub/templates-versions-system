/**
 * Validation middleware using express-validator (per docs/dev/team3_advanced_guide.html)
 */

import {
  body,
  param,
  query,
  validationResult,
  ValidationChain,
} from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/** Middleware that checks validation result and returns 400 on errors */
function handleValidationResult(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const arr = errors.array();
    const firstMsg = arr[0]?.msg ?? 'Ошибка валидации';
    res.status(400).json({
      errors: arr,
      error: firstMsg, // for frontend backward compatibility (AuthContext expects response.data.error)
    });
    return;
  }
  next();
}

/** Chains validation rules with the result handler */
function validate(validations: ValidationChain[]) {
  return [...validations, handleValidationResult];
}

// ─── Template validators ───

export const validateTemplateCreate = validate([
  body('name')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Название шаблона должно быть не менее 3 символов'),
  body('description')
    .optional()
    .trim(),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Категория шаблона обязательна'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Отдел обязателен'),
  body('tags')
    .optional(),
  body('author')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'approved', 'deprecated'])
    .withMessage('Статус должен быть draft, approved или deprecated'),
]);

export const validateTemplateUpdate = validate([
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Название шаблона должно быть не менее 3 символов'),
  body('description')
    .optional()
    .trim(),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Категория не может быть пустой'),
  body('department')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Отдел не может быть пустым'),
  body('tags')
    .optional(),
  body('author')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['draft', 'approved', 'deprecated'])
    .withMessage('Статус должен быть draft, approved или deprecated'),
]);

export const validateTemplateStatus = validate([
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Статус обязателен')
    .isIn(['draft', 'approved', 'deprecated'])
    .withMessage('Статус должен быть draft, approved или deprecated'),
]);

// ─── Auth validators ───

export const validateRegister = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email обязателен')
    .isEmail()
    .withMessage('Некорректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен')
    .isLength({ min: 6 })
    .withMessage('Пароль должен быть не менее 6 символов'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Имя обязательно')
    .isLength({ min: 1 })
    .withMessage('Имя не может быть пустым'),
]);

export const validateLogin = validate([
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email обязателен')
    .isEmail()
    .withMessage('Некорректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен'),
]);

export const validateUpdateProfile = validate([
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Имя не может быть пустым'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Некорректный email'),
  body().custom((value) => {
    const hasName = value?.name != null && String(value.name).trim() !== '';
    const hasEmail = value?.email != null && String(value.email).trim() !== '';
    if (!hasName && !hasEmail) {
      throw new Error('Необходимо указать хотя бы одно поле для обновления (name, email)');
    }
    return true;
  }),
]);

export const validateChangePassword = validate([
  body('currentPassword')
    .notEmpty()
    .withMessage('Текущий пароль обязателен'),
  body('newPassword')
    .notEmpty()
    .withMessage('Новый пароль обязателен')
    .isLength({ min: 6 })
    .withMessage('Новый пароль должен быть не менее 6 символов'),
]);

// ─── Param validators (MongoDB ObjectId) ───

export const validateMongoIdParam = (paramName: string) =>
  validate([
    param(paramName)
      .isMongoId()
      .withMessage(`Некорректный ID: ${paramName}`),
  ]);

export const validateTemplateId = validateMongoIdParam('id');
export const validateVersionId = validateMongoIdParam('versionId');

/** For restore version route: /templates/:id/versions/:versionId/restore */
export const validateRestoreVersionParams = validate([
  param('id').isMongoId().withMessage('Некорректный ID шаблона'),
  param('versionId').isMongoId().withMessage('Некорректный ID версии'),
]);

/** For compare versions route: /templates/:id/versions/compare/:version1Id/:version2Id */
export const validateCompareVersionsParams = validate([
  param('id').isMongoId().withMessage('Некорректный ID шаблона'),
  param('version1Id').isMongoId().withMessage('Некорректный ID версии 1'),
  param('version2Id').isMongoId().withMessage('Некорректный ID версии 2'),
]);

// ─── Query validators ───

export const validateSearchQuery = validate([
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Параметр поиска "q" обязателен'),
]);

export const validateAutocompleteQuery = validate([
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Параметр поиска "q" обязателен'),
]);
