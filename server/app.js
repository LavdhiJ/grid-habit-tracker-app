// server/index.js

import express from 'express';
import cors from 'cors';

import dotenv from 'dotenv';

import { initializeCronJobs } from './jobs/cronJob.js';
import userRouter from './routes/user.routes.js' 
import taskRouter from './routes/task.routes.js'


dotenv.config();

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
const PORT = process.env.PORT || 5000;

// Middleware
//app.use(cors());
app.use(cors({
    origin: "http://localhost:5000", // or "*" for Postman
    credentials: true, // 🔥 IMPORTANT
}));
app.use(express.json());
initializeCronJobs() ;

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tasks' , taskRouter);
app.get('/', (req, res) => {
  res.send('Habit Tracker API is running...');
});

 export {app} 
 //POST /api/v1/users/register
