'use strict';
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI não definida no .env');
    }
    await mongoose.connect(uri);
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('❌ Erro ao conectar MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
