import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ CORS for all origins — dev safe
app.use(cors({
  origin: (origin, callback) => callback(null, origin || "*"),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Root route for Render cold-start and health checks
app.get("/", (req, res) => {
  res.status(200).send("✅ Resume parser is running.");
});

// ✅ Parse uploaded resume
app.post("/parse-resume", upload.single("resume"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileBuffer = await fs.readFile(file.path);
    let text = "";

    if (fileExt === ".pdf") {
      const pdfParse = (await import("pdf-parse")).default;
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
      await fs.unlink(file.path);
    } catch (cleanupErr) {
      console.warn("Failed to delete temp file:", cleanupErr);
    }
  }
});

// ✅ Required by Render: dynamic port binding
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

