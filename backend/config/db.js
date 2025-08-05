const mongoose = require('mongoose');
const dotenv = require('dotenv'); 
dotenv.config(); 

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database Connected");
    } catch (err){
        console.log('MongoDB connection error', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;