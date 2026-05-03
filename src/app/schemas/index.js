'use strict';
const mongoose = require('mongoose');

// ─── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:           { type: String, required: true, minlength: 2, maxlength: 60 },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  role:           { type: String, enum: ['user', 'admin'], default: 'user' },
  bio:            { type: String, default: '', maxlength: 280 },
  profilePicture: { type: String, default: null },
  createdAt:      { type: Date, default: Date.now }
});

userSchema.methods.isAdmin = function () { return this.role === 'admin'; };

// ─── Todo ─────────────────────────────────────────────────────────────────────
const todoItemSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  checked:   { type: Boolean, default: false },
  inReport:  { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const todoSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  todoList: { type: [todoItemSchema], default: [] }
});

// ─── Kanban ───────────────────────────────────────────────────────────────────
const cardSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  assignee:    { type: String, default: '' },
  dueDate:     { type: Date, default: null },
  tags:        [String],
  createdAt:   { type: Date, default: Date.now }
}, { _id: true });

const columnSchema = new mongoose.Schema({
  title: { type: String, required: true },
  cards: { type: [cardSchema], default: [] }
}, { _id: true });

const boardSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  columns:     { type: [columnSchema], default: [] },
  sharedWith:  { type: [String], default: [] }, // emails with access
  isPublic:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
}, { _id: true });

const kanbanSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true },
  kanbanBoards: { type: [boardSchema], default: [] }
});

// ─── Jam ─────────────────────────────────────────────────────────────────────
const jamMemberSchema = new mongoose.Schema({
  email:    String,
  name:     String,
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const jamKanbanCardSchema = new mongoose.Schema({
  title:       String,
  description: { type: String, default: '' },
  assignee:    String,
  priority:    { type: String, default: 'medium' },
  createdAt:   { type: Date, default: Date.now }
}, { _id: true });

const jamKanbanColumnSchema = new mongoose.Schema({
  title: String,
  cards: { type: [jamKanbanCardSchema], default: [] }
}, { _id: true });

const jamSchema = new mongoose.Schema({
  code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:         { type: String, default: 'Jam Session' },
  ownerEmail:   String,
  members:      { type: [jamMemberSchema], default: [] },
  duration:     { type: Number, default: 1500 },   // seconds
  restDuration: { type: Number, default: 300 },    // seconds
  phase:        { type: String, enum: ['work', 'rest'], default: 'work' },
  running:      { type: Boolean, default: false },
  targetAt:     { type: Date, default: null },
  kanbanBoard:  {
    columns: { type: [jamKanbanColumnSchema], default: [
      { title: 'A Fazer' },
      { title: 'Fazendo' },
      { title: 'Concluído' }
    ]}
  },
  updatedAt: { type: Date, default: Date.now }
});

const User   = mongoose.model('User',   userSchema);
const Todo   = mongoose.model('Todo',   todoSchema);
const Kanban = mongoose.model('Kanban', kanbanSchema);
const Jam    = mongoose.model('Jam',    jamSchema);

module.exports = { User, Todo, Kanban, Jam };
