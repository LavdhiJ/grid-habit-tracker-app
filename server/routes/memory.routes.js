import { Router } from 'express';
import {
    createMemory,
    getAllMemories,
    getMemoryById,
    updateMemory,
    deleteMemory,
    getMemoriesByTag,
    getUntaggedMemories,
    getAllTags,
    exportMemories
} from '../controllers/memory.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyJWT);


router.route('/')
    .get(getAllMemories)    // GET /api/memories
    .post(createMemory);    // POST /api/memories

router.route('/:id')
    .get(getMemoryById)     // GET /api/memories/:id
    .put(updateMemory)      // PUT /api/memories/:id
    .delete(deleteMemory);  // DELETE /api/memories/:id

// Tag-related routes
router.get('/tags/all', getAllTags);                    // GET /api/memories/tags/all
router.get('/tags/:tag', getMemoriesByTag);             // GET /api/memories/tags/:tag
router.get('/filter/untagged', getUntaggedMemories);    // GET /api/memories/filter/untagged

// Export route
router.get('/export/download', exportMemories);         // GET /api/memories/export/download

export default router;