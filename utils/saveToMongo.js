import { logger } from "../config/logger.js";
import MEA from "../models/mea.js";

const createIfNotExists = async (data) => {
  try {
    const DBModel = MEA;
    // console.log("save- ", data);
    logger.info({
      SavingData: data,
    });
    // Check if a document with the same title already exists
    const existingDocument = await DBModel.findOne({ pdfUrls: data.pdfUrls });

    if (existingDocument) {
      console.log("Document already exists:", existingDocument);
      return existingDocument; // Return the existing document
    }

    // Function to remove specific unwanted special characters from the start and end of a string
    function removeLeadingAndTrailingSpecialChars(input) {
      // Define a regex that matches unwanted special characters or spaces at the start and end of the string
      const unwantedCharsPattern =
        /^[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+|[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+$/gu; // List of unwanted special characters + spaces

      // Remove unwanted characters from the start and end, and then trim the string
      return input.replace(unwantedCharsPattern, "").trim();
    }

    data.title = removeLeadingAndTrailingSpecialChars(data.title);
    data.title = data.title.trim();

    // Escape any special regex characters in the title
    const safeTitle = data.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Regular expression to match titles with format: "my title" or "my title (1)", "my title (2)", etc.
    const titlePattern = new RegExp(`^${safeTitle}( \\(\\d+\\))?$`);

    // Find documents with matching title patterns
    const existingDocumentsWithSimilarTitles = await DBModel.find({
      title: { $regex: titlePattern },
    });

    // If there are matching titles, determine the highest suffix number to generate the next unique title
    if (existingDocumentsWithSimilarTitles.length > 0) {
      data.title = `${data.title} (${existingDocumentsWithSimilarTitles.length})`;
    }

    // Replace all line breaks with a single space and trim leading/trailing spaces
    data.title = data.title.replace(/[\n\r]+/g, " ").trim();

    delete data.pageUrl; // Removes the 'pageUrl' key from the data object

    // If it doesn't exist, create a new document
    const newDocument = new DBModel(data);
    const savedDocument = await newDocument.save();
    // if (existingDocumentwithSameTitle) console.log("Document created:", savedDocument.title);
    return savedDocument;
  } catch (error) {
    console.error("Error in createIfNotExists:", error);
  }
};

export default createIfNotExists;
