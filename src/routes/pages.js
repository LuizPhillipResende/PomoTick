'use strict';
const express = require('express');
const { requireAuth } = require('../app/middlewares/auth.js');

const router = express.Router();

router.get('/home', requireAuth, (req, res) => {
  res.render('home', { user: req.session.user });
});

router.get('/admin', requireAuth, (req, res) => {
  if (req.session.user.role !== 'admin') return res.redirect('/home');
  res.render('admin', { user: req.session.user });
});

module.exports = router;
