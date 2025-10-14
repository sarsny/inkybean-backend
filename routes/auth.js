const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { validateRequest, authSchemas } = require('../middleware/validation');

const router = express.Router();

// POST /auth/register - 用户注册
router.post('/register', validateRequest(authSchemas.register), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use Supabase Auth to create user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined // Disable email confirmation for now
      }
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({
        error: 'Registration failed',
        message: error.message,
        code: error.code || 'REGISTRATION_FAILED'
      });
    }

    if (!data.user) {
      return res.status(400).json({
        error: 'Registration failed',
        message: 'User creation failed',
        code: 'USER_CREATION_FAILED'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: data.user.id, 
        email: data.user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /auth/login - 用户登录
router.post('/login', validateRequest(authSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use Supabase Auth to sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        error: 'Login failed',
        message: error.message,
        code: error.code || 'LOGIN_FAILED'
      });
    }

    if (!data.user) {
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: data.user.id, 
        email: data.user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        lastSignInAt: data.user.last_sign_in_at
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;