const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
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

// POST /auth/wechat - 微信授权登录
router.post('/wechat', validateRequest(authSchemas.wechat), async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
        message: 'WeChat authorization code is required',
        code: 'MISSING_CODE'
      });
    }

    // Step 1: Exchange code for access_token
    const tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        code: code,
        grant_type: 'authorization_code'
      }
    });

    if (tokenResponse.data.errcode) {
      console.error('WeChat token error:', tokenResponse.data);
      return res.status(400).json({
        error: 'WeChat authorization failed',
        message: tokenResponse.data.errmsg || 'Failed to get access token',
        code: 'WECHAT_TOKEN_ERROR'
      });
    }

    const { access_token, openid, unionid } = tokenResponse.data;

    // Step 2: Get user info from WeChat
    const userInfoResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
      params: {
        access_token: access_token,
        openid: openid,
        lang: 'zh_CN'
      }
    });

    if (userInfoResponse.data.errcode) {
      console.error('WeChat userinfo error:', userInfoResponse.data);
      return res.status(400).json({
        error: 'Failed to get user info',
        message: userInfoResponse.data.errmsg || 'Failed to get user information',
        code: 'WECHAT_USERINFO_ERROR'
      });
    }

    const wechatUser = userInfoResponse.data;

    // Step 3: Check if user exists in our database
    let user;
    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('wechat_openid', openid)
      .single();

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Database query error:', queryError);
      return res.status(500).json({
        error: 'Database error',
        code: 'DATABASE_ERROR'
      });
    }

    if (existingUser) {
      // User exists, update their info
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          wechat_nickname: wechatUser.nickname,
          wechat_avatar: wechatUser.headimgurl,
          wechat_unionid: unionid,
          last_login_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('User update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update user',
          code: 'USER_UPDATE_ERROR'
        });
      }

      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wechat_openid: openid,
          wechat_unionid: unionid,
          wechat_nickname: wechatUser.nickname,
          wechat_avatar: wechatUser.headimgurl,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        return res.status(500).json({
          error: 'Failed to create user',
          code: 'USER_CREATION_ERROR'
        });
      }

      user = newUser;
    }

    // Step 4: Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        openid: user.wechat_openid,
        loginType: 'wechat'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'WeChat login successful',
      user: {
        id: user.id,
        nickname: user.wechat_nickname,
        avatar: user.wechat_avatar,
        openid: user.wechat_openid,
        unionid: user.wechat_unionid,
        lastLoginAt: user.last_login_at
      },
      token
    });

  } catch (error) {
    console.error('WeChat login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;