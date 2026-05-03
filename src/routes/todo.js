'use strict';
const express = require('express');
const { requireAuth } = require('../app/middlewares/auth.js');
const { Todo } = require('../app/schemas/index.js');

const router = express.Router();
router.use(requireAuth);

// GET /api/todo
router.get('/', async (req, res) => {
  try {
    const todo = await Todo.findOne({ email: req.session.user.email });
    res.json({ success: true, todoList: todo ? todo.todoList : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/todo  — add item
router.post('/', async (req, res) => {
  try {
    const { text, inReport } = req.body;
    if (!text || !text.trim())
      return res.status(400).json({ success: false, error: 'Texto da tarefa é obrigatório.' });

    const newItem = { text: text.trim(), checked: false, inReport: !!inReport };
    const todo = await Todo.findOneAndUpdate(
      { email: req.session.user.email },
      { $push: { todoList: newItem } },
      { upsert: true, new: true }
    );
    const added = todo.todoList[todo.todoList.length - 1];
    res.json({ success: true, item: added });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/todo/:id  — toggle checked
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checked } = req.body;
    const todo = await Todo.findOne({ email: req.session.user.email });
    if (!todo) return res.status(404).json({ success: false, error: 'Lista não encontrada.' });

    const item = todo.todoList.id(id);
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado.' });

    item.checked = !!checked;
    await todo.save();
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/todo/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Todo.findOneAndUpdate(
      { email: req.session.user.email },
      { $pull: { todoList: { _id: id } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/todo/report  — items marked inReport
router.get('/report', async (req, res) => {
  try {
    const todo = await Todo.findOne({ email: req.session.user.email });
    const report = todo ? todo.todoList.filter(i => i.inReport) : [];
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
