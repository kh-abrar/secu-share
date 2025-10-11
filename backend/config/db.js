const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Database Connected");
  } catch (err) {
    console.log('MongoDB connection error', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;