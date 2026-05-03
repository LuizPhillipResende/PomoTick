'use strict';
const express = require('express');
const { requireAuth } = require('../app/middlewares/auth.js');
const { Kanban } = require('../app/schemas/index.js');

const router = express.Router();
router.use(requireAuth);

const DEFAULT_COLUMNS = [
  { title: 'A Fazer' },
  { title: 'Em Progresso' },
  { title: 'Concluído' }
];

async function getOrCreateKanban(email) {
  let k = await Kanban.findOne({ email });
  if (!k) k = await Kanban.create({ email, kanbanBoards: [] });
  return k;
}

// GET /api/kanban — list boards
router.get('/', async (req, res) => {
  try {
    const k = await Kanban.findOne({ email: req.session.user.email });
    res.json({ success: true, boards: k ? k.kanbanBoards : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/kanban — create board
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ success: false, error: 'Título é obrigatório.' });

    const k = await getOrCreateKanban(req.session.user.email);
    const newBoard = {
      title:       title.trim(),
      description: (description || '').trim(),
      columns:     DEFAULT_COLUMNS.map(c => ({ title: c.title, cards: [] })),
      createdAt:   new Date(),
      updatedAt:   new Date()
    };
    k.kanbanBoards.push(newBoard);
    await k.save();
    const saved = k.kanbanBoards[k.kanbanBoards.length - 1];
    res.json({ success: true, board: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/kanban/:boardId
router.delete('/:boardId', async (req, res) => {
  try {
    const k = await Kanban.findOne({ email: req.session.user.email });
    if (!k) return res.status(404).json({ success: false, error: 'Quadro não encontrado.' });
    k.kanbanBoards.pull({ _id: req.params.boardId });
    await k.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/kanban/:boardId/card — add card to column
router.post('/:boardId/card', async (req, res) => {
  try {
    const { columnId, title, description, priority, assignee } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ success: false, error: 'Título do card é obrigatório.' });

    const k = await Kanban.findOne({ email: req.session.user.email });
    if (!k) return res.status(404).json({ success: false, error: 'Kanban não encontrado.' });

    const board = k.kanbanBoards.id(req.params.boardId);
    if (!board) return res.status(404).json({ success: false, error: 'Quadro não encontrado.' });

    const column = board.columns.id(columnId);
    if (!column) return res.status(404).json({ success: false, error: 'Coluna não encontrada.' });

    const card = {
      title:       title.trim(),
      description: (description || '').trim(),
      priority:    priority || 'medium',
      assignee:    assignee || req.session.user.name,
      createdAt:   new Date()
    };
    column.cards.push(card);
    board.updatedAt = new Date();
    await k.save();
    res.json({ success: true, card: column.cards[column.cards.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/kanban/:boardId/card/:cardId
router.delete('/:boardId/card/:cardId', async (req, res) => {
  try {
    const k = await Kanban.findOne({ email: req.session.user.email });
    const board = k && k.kanbanBoards.id(req.params.boardId);
    if (!board) return res.status(404).json({ success: false, error: 'Quadro não encontrado.' });

    for (const col of board.columns) {
      const card = col.cards.id(req.params.cardId);
      if (card) { col.cards.pull(req.params.cardId); break; }
    }
    board.updatedAt = new Date();
    await k.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/kanban/:boardId/card/:cardId/move
router.patch('/:boardId/card/:cardId/move', async (req, res) => {
  try {
    const { fromColumnId, toColumnId } = req.body;
    const k = await Kanban.findOne({ email: req.session.user.email });
    const board = k && k.kanbanBoards.id(req.params.boardId);
    if (!board) return res.status(404).json({ success: false, error: 'Quadro não encontrado.' });

    const fromCol = board.columns.id(fromColumnId);
    const toCol   = board.columns.id(toColumnId);
    if (!fromCol || !toCol)
      return res.status(404).json({ success: false, error: 'Coluna não encontrada.' });

    const card = fromCol.cards.id(req.params.cardId);
    if (!card) return res.status(404).json({ success: false, error: 'Card não encontrado.' });

    const cardData = card.toObject();
    fromCol.cards.pull(req.params.cardId);
    toCol.cards.push(cardData);
    board.updatedAt = new Date();
    await k.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
