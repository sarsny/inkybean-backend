const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

// Validation schemas
const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    username: Joi.string().min(2).max(50).optional()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  wechat: Joi.object({
    code: Joi.string().required()
  })
};

const progressSchemas = {
  submit: Joi.object({
    correctCount: Joi.number().integer().min(0).required(),
    totalCount: Joi.number().integer().min(1).required()
  }).custom((value, helpers) => {
    if (value.correctCount > value.totalCount) {
      return helpers.error('any.invalid', { 
        message: 'correctCount cannot be greater than totalCount' 
      });
    }
    return value;
  })
};

module.exports = {
  validateRequest,
  authSchemas,
  progressSchemas
};