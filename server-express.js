const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// ── Database setup ──
// Opens (or creates) a file called expenses.db in the project folder.
// This file is where all expense data will be permanently stored.
const db = new Database('expenses.db');

// Create the expenses table if it doesn't exist yet.
// This runs every time the server starts — "IF NOT EXISTS" means
// it won't overwrite existing data if the table is already there.
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    desc  TEXT    NOT NULL,
    amount REAL   NOT NULL,
    cat   TEXT    NOT NULL,
    date  TEXT    NOT NULL
  )
`);

console.log('Database ready.');

// ── GET /expenses ──
// Reads all rows from the expenses table and returns them as JSON.
app.get('/expenses', function(req, res) {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  res.json(expenses);
});

// ── POST /expenses ──
// Reads the expense data sent by the client and inserts it as a new row.
app.post('/expenses', function(req, res) {
  const { desc, amount, cat, date } = req.body;

  if (!desc || !amount || !cat || !date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const result = db.prepare(
    'INSERT INTO expenses (desc, amount, cat, date) VALUES (?, ?, ?, ?)'
  ).run(desc, amount, cat, date);

  res.json({ id: result.lastInsertRowid, desc, amount, cat, date });
});

// ── DELETE /expenses/:id ──
// Deletes the row with the matching id from the database.
app.delete('/expenses/:id', function(req, res) {
  const id = req.params.id;
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ message: `Expense ${id} deleted.` });
});

// Start the server
app.listen(PORT, function() {
  console.log(`Server running at http://localhost:${PORT}`);
});
