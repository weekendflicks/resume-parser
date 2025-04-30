import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/parse-resume", upload.single("resume"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const fileExt = path.extname(file.originalname).toLowerCase();
    let text = "";

    if (fileExt === ".pdf") {
      const data = await fs.readFile(file.path);
      const parsed = await pdfParse(data);
      text = parsed.text;
    } else if (fileExt === ".docx") {
      const data = await fs.readFile(file.path);
      const result = await mammoth.extractRawText({ buffer: data });
      text = result.value;
    } else if (fileExt === ".txt") {
      text = await fs.readFile(file.path, "utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    res.json({ text });
  } catch (err) {
    console.error("Parsing error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  } finally {
    await fs.unlink(file.path);
  }
});

app.get("/", (req, res) => {
  res.send("Resume parser is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
