import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { HttpsProxyAgent } from 'https-proxy-agent';
import pool from '../db.js';

const router = Router();

// Support proxy for Google API verification
const proxyAgent = process.env.HTTPS_PROXY
  ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
  : undefined;

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  ...(proxyAgent ? { transporterOptions: { agent: proxyAgent } } : {}),
});

// POST /auth/google  { idToken }
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Upsert user
    await pool.query(
      `INSERT INTO users (google_id, email, name, avatar)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), avatar=VALUES(avatar)`,
      [googleId, email, name, picture]
    );

    const [[user]] = await pool.query(
      'SELECT id, email, name, avatar FROM users WHERE google_id = ?',
      [googleId]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token, user });
  } catch (e) {
    console.error('[auth] google verify error:', e.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
