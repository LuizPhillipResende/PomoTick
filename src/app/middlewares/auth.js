'use strict';

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.headers['content-type'] === 'application/json' ||
        req.headers['accept'] === 'application/json' ||
        req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Não autenticado.' });
    }
    return res.redirect('/');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
