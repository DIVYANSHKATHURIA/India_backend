require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { storage } = require('./cloudinaryConfig');
const upload = multer({ storage });
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/questions', async (req, res) => {
  try {
    const questionsResult = await pool.query('SELECT * FROM questions ORDER BY id');
    const questions = questionsResult.rows;

    for (const question of questions) {
      const repliesResult = await pool.query('SELECT * FROM replies WHERE question_id = $1 ORDER BY id', [question.id]);
      question.replies = repliesResult.rows;
    }

    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // req.file.path is the secure URL provided by Cloudinary
  res.status(200).json({ url: req.file.path });
  console.log(req.file.path );
});

// POST a new question
app.post('/questions', async (req, res) => {
  try {
    const { question, author, category } = req.body;
    const result = await pool.query('INSERT INTO questions (question, author, category) VALUES ($1, $2, $3) RETURNING *', [question, author, category]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new reply
app.post('/replies', async (req, res) => {
  try {
    const { question_id, author, text, time_ago } = req.body;
    const result = await pool.query(
      'INSERT INTO replies (question_id, author, text, time_ago) VALUES ($1, $2, $3, $4) RETURNING *',
      [question_id, author, text, time_ago]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/events', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/blogs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM travel_blogs ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error querying travel_blogs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/blogs', async (req, res) => {
  // Destructure the expected fields from the request body
  const { title, excerpt, image_url, blog_date, read_time, author_name, author_location } = req.body;

  try {
    // Insert the new blog post into the travel_blogs table
    const result = await pool.query(
      `INSERT INTO travel_blogs 
       (title, excerpt, image_url, blog_date, read_time, author_name, author_location) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, excerpt, image_url, blog_date, read_time, author_name, author_location]
    );

    // Return the newly created blog post as a JSON response
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting blog:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
