import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl =
  "mongodb+srv://subhabiswal100:0vsTSpl3PYHu90yv@cluster0.piyhowh.mongodb.net/";
// MongoDB connection setup
async function connectToDB() {
  try {
    await mongoose.connect(`${mongoUrl}`);
    console.log("Connected to MongoDB- ", mongoUrl);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

export default connectToDB;
