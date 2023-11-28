import express from 'express';
import session from 'express-session';
import user from '../schemas/user.js';

function hasAccess(accessLevel) {
  return async function(req, res, next) {
      try {
          const userData = await user.findOne({ email: req.session.user.email });
          if (userData && userData.hasAccess(accessLevel)) {
              return next();
          }
          return res.json({
              success: false,
              error: 'Não autorizado!'
          });
      } catch (error) {
          console.error(error);
          return res.json({
              success: false,
              error: 'Erro ao verificar autorização!'
          });
      }
  };
}

export default hasAccess;