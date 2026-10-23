import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'grocify_super_secret_jwt_key_2026';

app.use(cors());
app.use(helmet());
app.use(express.json());

// --- ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Grocify Node API is running securely' });
});

// Basic Auth for testing (simplified)
app.post('/api/auth/register', async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string(), role: z.enum(['CUSTOMER', 'SHOPKEEPER']) });
    const { email, password, name, role } = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role }
    });

    if (role === 'SHOPKEEPER') {
      await prisma.store.create({
        data: { name: `${name}'s Store`, address: '123 Smart St.', ownerId: user.id }
      });
    }

    res.json({ message: 'User created successfully', userId: user.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { store: true } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, storeId: user.store?.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mock an event pipeline endpoint that triggers the Python ML
app.post('/api/purchases', async (req, res) => {
  try {
    // In production, this would drop onto BullMQ and return 202.
    const { customerId, storeId, items } = req.body;
    
    // Simulate DB operation
    res.status(202).json({ status: 'Processing', message: 'Purchase logged and routed to ML intelligence engine.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Grocify Node Backend running on http://localhost:${PORT}`);
});
