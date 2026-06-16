const mongoose = require('mongoose');
const dns = require('dns');

// If using MongoDB Atlas SRV URI, set custom DNS servers to prevent Node.js resolution issues on Windows
if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('Set custom DNS servers (8.8.8.8, 1.1.1.1) for Atlas SRV resolution.');
  } catch (err) {
    console.warn('Failed to set custom DNS servers for SRV resolution:', err.message);
  }
}

// Register connection event listeners once
mongoose.connection.on('connected', () => {
  console.log(`MongoDB connected successfully: ${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Mongoose will attempt to reconnect automatically.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully.');
});

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/keystroke-research';

  const maxRetries = 5;
  const retryDelayMs = 5000;
  let attempt = 1;

  const tryConnect = async () => {
    try {
      console.log(`Connecting to MongoDB... (Attempt ${attempt}/${maxRetries})`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        attempt += 1;
        console.log(`Waiting ${retryDelayMs / 1000} seconds before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        return tryConnect();
      } else {
        console.error('Max database connection retries exceeded. Exiting application.');
        process.exit(1);
      }
    }
  };

  await tryConnect();
};

// Graceful shutdown handling
const handleGracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Gracefully closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

module.exports = connectDB;
