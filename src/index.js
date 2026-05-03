'use strict';
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const MongoStore     = require('connect-mongo');
const path           = require('path');
const connectDB      = require('./database/index.js');

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth.js');
const pageRoutes    = require('./routes/pages.js');
const profileRoutes = require('./routes/profile.js');
const todoRoutes    = require('./routes/todo.js');
const kanbanRoutes  = require('./routes/kanban.js');
const jamRoutes     = require('./routes/jam.js');
const adminRoutes   = require('./routes/admin.js');

// ─── Init ────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  // ─── Middleware ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));

  app.use(session({
    secret:            process.env.SESSION_SECRET || 'pomotick-dev-secret',
    resave:            false,
    saveUninitialized: false,
    store:             MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie:            { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
  }));

  // ─── Router mount ──────────────────────────────────────────────────────────
  app.use('/',            authRoutes);
  app.use('/',            pageRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/todo',    todoRoutes);
  app.use('/api/kanban',  kanbanRoutes);
  app.use('/api/jam',     jamRoutes);
  app.use('/api/admin',   adminRoutes);

  // ─── 404 ───────────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).send('<h2>404 — Página não encontrada</h2><a href="/">Voltar</a>');
  });

  // ─── Error handler ─────────────────────────────────────────────────────────
  app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 PomoTick rodando em http://localhost:${PORT}`);
  });
});
