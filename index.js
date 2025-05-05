import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import cors from "cors"; // ✅ added cors

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ Enable CORS
app.use(
  cors({
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.post("/parse-resume", upload.single("resume"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileBuffer = await fs.readFile(file.path);
    let text = "";

    if (fileExt === ".pdf") {
      const parsed = await pdfParse(fileBuffer);
      text = parsed.text;
    } else if (fileExt === ".docx") {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
    } else if (fileExt === ".txt") {
      text = fileBuffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: "Resume text too short or empty" });
    }

    res.status(200).json({ text });
  } catch (err) {
    console.error("Parsing error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  } finally {
    try {
      await fs.unlink(file.path); // Clean up temp file
    } catch (cleanupErr) {
      console.warn("Failed to delete temp file:", cleanupErr);
    }
  }
});

app.get("/", (req, res) => {
  res.send("✅ Resume parser is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
