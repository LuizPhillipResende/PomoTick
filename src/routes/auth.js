'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const { User } = require('../schemas/index.js');

const router = express.Router();

// GET /
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('login', { error: null });
});

// GET /signup
router.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('signup', { error: null });
});

// POST /api/login
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(401).json({ success: false, error: 'Email ou senha incorretos.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, error: 'Email ou senha incorretos.' });

    req.session.user = {
      _id:   user._id.toString(),
      name:  user.name,
      email: user.email,
      role:  user.role
    };

    res.json({ success: true });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  }
});

// POST /api/signup
router.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: 'Preencha todos os campos.' });

    if (password.length < 6)
      return res.status(400).json({ success: false, error: 'Senha deve ter no mínimo 6 caracteres.' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, error: 'Este email já está cadastrado.' });

    const hash = await bcrypt.hash(password, 10);
    await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hash });

    res.status(201).json({ success: true, message: 'Conta criada com sucesso!' });
  } catch (err) {
    console.error('signup:', err);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
