import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('habits.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS completions (
    task_id TEXT,
    date TEXT,
    completed INTEGER DEFAULT 0,
    PRIMARY KEY (task_id, date),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY time ASC').all();
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const { title, time } = req.body;
    const id = randomUUID();
    db.prepare('INSERT INTO tasks (id, title, time) VALUES (?, ?, ?)').run(id, title, time);
    res.json({ id, title, time });
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.get('/api/completions', (req, res) => {
    const { date, month } = req.query;
    if (date) {
      const completions = db.prepare('SELECT * FROM completions WHERE date = ?').all(date);
      res.json(completions);
    } else if (month) {
      const completions = db.prepare('SELECT * FROM completions WHERE date LIKE ?').all(`${month}-%`);
      res.json(completions);
    } else {
      const completions = db.prepare('SELECT * FROM completions').all();
      res.json(completions);
    }
  });

  app.post('/api/completions', (req, res) => {
    const { task_id, date, completed } = req.body;
    db.prepare(`
      INSERT INTO completions (task_id, date, completed) 
      VALUES (?, ?, ?) 
      ON CONFLICT(task_id, date) DO UPDATE SET completed = excluded.completed
    `).run(task_id, date, completed ? 1 : 0);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
