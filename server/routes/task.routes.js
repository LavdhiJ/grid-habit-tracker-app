import { Router } from 'express';
import TaskController from '../controllers/task.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js'; // Assuming you have auth middleware

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Task CRUD Operations
router.post('/', TaskController.createTask);                    // POST /api/tasks
router.get('/', TaskController.getTasks);                       // GET /api/tasks
router.get('/stats', TaskController.getTaskStats);              // GET /api/tasks/stats
          
router.get('/reminders/due', TaskController.getDueReminders);   // GET /api/tasks/reminders/due
router.get('/:id', TaskController.getTask);                     // GET /api/tasks/:id

router.patch('/:id', TaskController.updateTask);                  // PUT /api/tasks/:id
router.patch('/:id/toggle', TaskController.toggleTask);         // PATCH /api/tasks/:id/toggle
router.delete('/:id', TaskController.deleteTask);               // DELETE /api/tasks/:id

export default router;