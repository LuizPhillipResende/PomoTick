'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../app/middlewares/auth.js');
const { User, Todo } = require('../app/schemas/index.js');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });

    const oldEmail = user.email;
    user.name  = name  || user.name;
    user.email = email || user.email;
    user.role  = role  || user.role;
    await user.save();

    // update todo email reference
    if (email && email !== oldEmail) {
      await Todo.findOneAndUpdate({ email: oldEmail }, { email });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    await Todo.deleteOne({ email: user.email });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
