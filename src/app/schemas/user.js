'use strict'
import mongoose from '../../database/index.js';

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255
    },
    profilePicture: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        default: '',
        maxlength: 200
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        default: 'user',
    }
});

userSchema.plugin(require('mongoose-role'), {
    roles: ['user', 'admin'],
    accessLevels: {
        user: ['user', 'admin'],
        admin: ['admin']
    }
})

const todoUserSchema = mongoose.Schema({
    email: String,
    todoList:[{
        text: String,
        checked: Boolean,
        relatorio: Boolean,
        display: String
    }]
})

const kanbanSchema = mongoose.Schema({
    email: String,
    kanbanBoards: [{
        id: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: String,
        columns: [{
            id: String,
            title: String,
            cards: [{
                id: String,
                title: String,
                description: String,
                priority: {
                    type: String,
                    enum: ['low', 'medium', 'high'],
                    default: 'medium'
                },
                dueDate: Date,
                assignee: String,
                tags: [String],
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }]
        }],
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }]
})

const jamSchema = mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    ownerEmail: String,
    members: [{
        email: String,
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    duration: {
        type: Number,
        default: 1500
    },
    restDuration: {
        type: Number,
        default: 300
    },
    phase: {
        type: String,
        enum: ['work', 'rest'],
        default: 'work'
    },
    running: {
        type: Boolean,
        default: false
    },
    targetAt: Date,
    kanbanBoard: {
        columns: [{
            id: String,
            title: String,
            cards: [{
                id: String,
                title: String,
                description: String,
                assignee: String,
                priority: String,
                dueDate: Date,
                createdAt: Date
            }]
        }]
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Todo = mongoose.model('Todo', todoUserSchema);
const Kanban = mongoose.model('Kanban', kanbanSchema);
const Jam = mongoose.model('Jam', jamSchema);
const User = mongoose.model('User', userSchema);

export {User, Todo, Kanban, Jam};


