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


const Todo = mongoose.model('Todo', todoUserSchema);
const User = mongoose.model('User', userSchema);
export {User, Todo};

var newUser = new User({ email: 'email@email.com', role: 'user' })



