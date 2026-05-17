const express = require('express');
const Database = require('better-sqlite3');
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// ── POST /chat ──
// Receives a natural language message, sends it to Claude along with
// the current expense list, and lets Claude add or delete expenses.
app.post('/chat', async function(req, res) {
  const { message } = req.body;

  // Fetch current expenses to give Claude context
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: `You are an expense tracker assistant. You help users add and delete expenses.
Current expenses in the database:
${JSON.stringify(expenses, null, 2)}

Today's date is: ${new Date().toISOString().slice(0, 10)}

When the user wants to add an expense, respond with a JSON block like this:
{"action": "add", "desc": "Groceries", "amount": 45.50, "cat": "Food", "date": "2026-05-10"}

When the user wants to delete an expense, respond with a JSON block like this:
{"action": "delete", "id": 3}

Categories must be one of: Food, Transport, Housing, Health, Entertainment, Shopping, Other.
After the JSON block, write a friendly confirmation message. Do not use markdown formatting.`,
    messages: [{ role: 'user', content: message }]
  });

  const text = response.content[0].text;

  // Strip JSON blocks and markdown code fences from the reply
  const cleanText = text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .trim();

  // Find ALL JSON blocks in Claude's response and execute each one
  const jsonMatches = text.match(/\{[\s\S]*?\}/g) || [];

  for (const match of jsonMatches) {
    try {
      const action = JSON.parse(match);

      if (action.action === 'add') {
        db.prepare(
          'INSERT INTO expenses (desc, amount, cat, date) VALUES (?, ?, ?, ?)'
        ).run(action.desc, action.amount, action.cat, action.date);
      }

      if (action.action === 'delete') {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(action.id);
      }
    } catch(e) {
      // JSON parsing failed — skip this block
    }
  }

  res.json({ reply: cleanText });
  
});

// Start the server
app.listen(PORT, function() {
  console.log(`Server running at http://localhost:${PORT}`);
});
