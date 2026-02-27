import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("music.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    filename TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS liked_songs (
    track_id INTEGER PRIMARY KEY,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(track_id) REFERENCES tracks(id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER,
    track_id INTEGER,
    position INTEGER,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id),
    FOREIGN KEY(track_id) REFERENCES tracks(id)
  );
`);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/tracks", (req, res) => {
    const tracks = db.prepare(`
      SELECT t.*, (SELECT 1 FROM liked_songs WHERE track_id = t.id) as is_liked
      FROM tracks t 
      ORDER BY upload_date DESC
    `).all();
    res.json(tracks);
  });

  app.post("/api/upload", upload.single("audio"), (req, res) => {
    try {
      const { title, artist } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const stmt = db.prepare("INSERT INTO tracks (title, artist, filename) VALUES (?, ?, ?)");
      const info = stmt.run(title || "Untitled", artist || "Unknown Artist", file.filename);

      res.json({ id: info.lastInsertRowid, title, artist, filename: file.filename });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Liked Songs
  app.get("/api/liked", (req, res) => {
    const tracks = db.prepare(`
      SELECT t.*, 1 as is_liked
      FROM tracks t
      JOIN liked_songs l ON t.id = l.track_id
      ORDER BY l.added_date DESC
    `).all();
    res.json(tracks);
  });

  app.post("/api/liked/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("INSERT OR IGNORE INTO liked_songs (track_id) VALUES (?)").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/liked/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM liked_songs WHERE track_id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Playlists
  app.get("/api/playlists", (req, res) => {
    const playlists = db.prepare("SELECT * FROM playlists ORDER BY created_at DESC").all();
    res.json(playlists);
  });

  app.post("/api/playlists", (req, res) => {
    const { name, description } = req.body;
    try {
      const info = db.prepare("INSERT INTO playlists (name, description) VALUES (?, ?)").run(name, description);
      res.json({ id: info.lastInsertRowid, name, description });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/playlists/:id/tracks", (req, res) => {
    const { id } = req.params;
    const tracks = db.prepare(`
      SELECT t.*, (SELECT 1 FROM liked_songs WHERE track_id = t.id) as is_liked
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position ASC
    `).all(id);
    res.json(tracks);
  });

  app.post("/api/playlists/:id/tracks", (req, res) => {
    const { id } = req.params;
    const { trackId } = req.body;
    try {
      const position = db.prepare("SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?").get(id).count;
      db.prepare("INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)").run(id, trackId, position);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
