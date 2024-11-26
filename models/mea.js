import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    title: String,
    pdfUrls: String,
    tagString: String,
    timestamp: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

const MEA = mongoose.model("MEA", pdfSchema);

export default MEA;
