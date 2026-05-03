'use strict';
const express = require('express');
const bcrypt  = require('bcryptjs');
const { requireAuth } = require('../app/middlewares/auth.js');
const { User } = require('../app/schemas/index.js');

const router = express.Router();
router.use(requireAuth);

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    res.json({ success: true, profile: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profile
router.put('/', async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name || name.trim().length < 2)
      return res.status(400).json({ success: false, error: 'Nome deve ter ao menos 2 caracteres.' });

    const updated = await User.findByIdAndUpdate(
      req.session.user._id,
      { name: name.trim(), bio: (bio || '').trim() },
      { new: true }
    ).select('-password');

    req.session.user.name = updated.name;
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profile/picture  — base64 stored in DB (small images only)
router.put('/picture', async (req, res) => {
  try {
    const { pictureData } = req.body;
    if (!pictureData || !pictureData.startsWith('data:image'))
      return res.status(400).json({ success: false, error: 'Imagem inválida.' });

    // Keep size reasonable (< 500 KB base64)
    if (pictureData.length > 700000)
      return res.status(400).json({ success: false, error: 'Imagem muito grande. Máximo 500 KB.' });

    await User.findByIdAndUpdate(req.session.user._id, { profilePicture: pictureData });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profile/password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, error: 'Preencha todos os campos.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, error: 'Nova senha deve ter ao menos 6 caracteres.' });

    const user = await User.findById(req.session.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ success: false, error: 'Senha atual incorreta.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
