'use strict';
const express = require('express');
const { requireAuth } = require('../app/middlewares/auth.js');
const { Jam } = require('../app/schemas/index.js');

const router = express.Router();
router.use(requireAuth);

// Auto-advance jam phase server-side
async function syncJamPhase(jam) {
  if (!jam || !jam.running || !jam.targetAt) return jam;
  const now = new Date();
  let changed = false;
  while (jam.running && jam.targetAt && now >= jam.targetAt) {
    changed = true;
    const nextPhase    = jam.phase === 'work' ? 'rest' : 'work';
    const nextDuration = nextPhase === 'work' ? jam.duration : jam.restDuration;
    jam.phase    = nextPhase;
    jam.targetAt = new Date(jam.targetAt.getTime() + nextDuration * 1000);
  }
  if (changed) { jam.updatedAt = new Date(); await jam.save(); }
  return jam;
}

function jamView(jam) {
  if (!jam) return null;
  const now = new Date();
  const remaining = jam.running && jam.targetAt
    ? Math.max(0, Math.round((jam.targetAt - now) / 1000))
    : (jam.phase === 'work' ? jam.duration : jam.restDuration);
  return {
    code:         jam.code,
    name:         jam.name,
    ownerEmail:   jam.ownerEmail,
    members:      jam.members,
    duration:     jam.duration,
    restDuration: jam.restDuration,
    phase:        jam.phase,
    running:      jam.running,
    remaining,
    kanbanBoard:  jam.kanbanBoard
  };
}

// POST /api/jam/create
router.post('/create', async (req, res) => {
  try {
    const code         = (req.body.code || '').trim().toUpperCase();
    const name         = (req.body.name || 'Jam Session').trim();
    const duration     = Math.max(1, Math.min(60, Number(req.body.duration) || 25)) * 60;
    const restDuration = Math.max(1, Math.min(30, Number(req.body.restDuration) || 5)) * 60;

    if (!code || code.length < 3)
      return res.status(400).json({ success: false, error: 'Código deve ter pelo menos 3 caracteres.' });

    const existing = await Jam.findOne({ code });
    if (existing)
      return res.status(409).json({ success: false, error: 'Já existe um Jam com este código.' });

    const jam = await Jam.create({
      code,
      name,
      ownerEmail:   req.session.user.email,
      members:      [{ email: req.session.user.email, name: req.session.user.name }],
      duration,
      restDuration,
      phase:        'work',
      running:      false
    });

    res.json({ success: true, jam: jamView(jam) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jam/join
router.post('/join', async (req, res) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Código é obrigatório.' });

    const jam = await Jam.findOne({ code });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    const already = jam.members.find(m => m.email === req.session.user.email);
    if (!already) {
      jam.members.push({ email: req.session.user.email, name: req.session.user.name });
      jam.updatedAt = new Date();
      await jam.save();
    }

    await syncJamPhase(jam);
    res.json({ success: true, jam: jamView(jam) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/jam/state?code=XXX
router.get('/state', async (req, res) => {
  try {
    const code = (req.query.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Código é obrigatório.' });

    const jam = await Jam.findOne({ code });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    await syncJamPhase(jam);
    res.json({ success: true, jam: jamView(jam) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jam/start
router.post('/start', async (req, res) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    const jam  = await Jam.findOne({ code });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    const isMember = jam.members.find(m => m.email === req.session.user.email);
    if (!isMember)
      return res.status(403).json({ success: false, error: 'Você não é membro deste Jam.' });

    if (!jam.running) {
      const duration     = Math.max(1, Math.min(60, Number(req.body.duration) || jam.duration / 60)) * 60;
      const restDuration = Math.max(1, Math.min(30, Number(req.body.restDuration) || jam.restDuration / 60)) * 60;
      jam.duration     = duration;
      jam.restDuration = restDuration;
      jam.phase        = 'work';
      jam.running      = true;
      jam.targetAt     = new Date(Date.now() + duration * 1000);
      jam.updatedAt    = new Date();
      await jam.save();
    }

    await syncJamPhase(jam);
    res.json({ success: true, jam: jamView(jam) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jam/stop
router.post('/stop', async (req, res) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    const jam  = await Jam.findOne({ code });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    const isMember = jam.members.find(m => m.email === req.session.user.email);
    if (!isMember)
      return res.status(403).json({ success: false, error: 'Você não é membro deste Jam.' });

    jam.running   = false;
    jam.targetAt  = null;
    jam.updatedAt = new Date();
    await jam.save();
    res.json({ success: true, jam: jamView(jam) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jam/leave
router.post('/leave', async (req, res) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();
    const jam  = await Jam.findOne({ code });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    jam.members = jam.members.filter(m => m.email !== req.session.user.email);
    jam.updatedAt = new Date();
    // If no members left, delete jam
    if (jam.members.length === 0) {
      await Jam.deleteOne({ code });
    } else {
      // If owner left, assign new owner
      if (jam.ownerEmail === req.session.user.email) {
        jam.ownerEmail = jam.members[0].email;
      }
      await jam.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jam/kanban/card  — add card to jam kanban
router.post('/kanban/card', async (req, res) => {
  try {
    const { code, columnId, title, description } = req.body;
    const jam = await Jam.findOne({ code: (code || '').toUpperCase() });
    if (!jam) return res.status(404).json({ success: false, error: 'Jam não encontrado.' });

    const col = jam.kanbanBoard.columns.id(columnId);
    if (!col) return res.status(404).json({ success: false, error: 'Coluna não encontrada.' });

    col.cards.push({ title, description: description || '', assignee: req.session.user.name });
    jam.updatedAt = new Date();
    await jam.save();
    res.json({ success: true, kanbanBoard: jam.kanbanBoard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: GET /api/jam/list
router.get('/list', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Acesso negado.' });
    const jams = await Jam.find({}).select('-kanbanBoard');
    res.json({ success: true, jams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
