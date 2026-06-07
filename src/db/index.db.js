import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `MongoDB connected! DB: ${connectionInstance.connection.name} | Host: ${connectionInstance.connection.host}`
    );

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected!");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
