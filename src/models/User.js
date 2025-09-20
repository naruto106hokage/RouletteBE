const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    default: ''
  },
  topUpBalance: {
    type: Number,
    default: 0
  },
  winningBalance: {
    type: Number,
    default: 0
  },
  otp: {
    code: String,
    expiry: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);