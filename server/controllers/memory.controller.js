import Memory from '../models/memory.model.js';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create new memory/note
const createMemory = asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    const userId = req.user._id; // From verifyJWT middleware

    // Validate that at least title or content is provided
    if (!title && !content) {
        throw new ApiError(400, 'Either title or content must be provided');
    }

    const memory = new Memory({
        title: title || '',
        content: content || '',
        tags: tags || [],
        userId
    });

    await memory.save();

    return res.status(201).json(
        new ApiResponse(201, memory, 'Memory created successfully')
    );
});

// Get all memories for user
const getAllMemories = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const memories = await Memory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Memory.countDocuments({ userId });

    const responseData = {
        memories,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalMemories: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }
    };

    return res.status(200).json(
        new ApiResponse(200, responseData, 'Memories fetched successfully')
    );
});

// Get memory by ID
const getMemoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid memory ID');
    }

    const memory = await Memory.findOne({ _id: id, userId });

    if (!memory) {
        throw new ApiError(404, 'Memory not found');
    }

    return res.status(200).json(
        new ApiResponse(200, memory, 'Memory fetched successfully')
    );
});

// Update memory
const updateMemory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid memory ID');
    }

    // Validate that at least title or content is provided
    if (title === '' && content === '') {
        throw new ApiError(400, 'Either title or content must be provided');
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;

    const memory = await Memory.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
    );

    if (!memory) {
        throw new ApiError(404, 'Memory not found');
    }

    return res.status(200).json(
        new ApiResponse(200, memory, 'Memory updated successfully')
    );
});

// Delete memory
const deleteMemory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'Invalid memory ID');
    }

    const memory = await Memory.findOneAndDelete({ _id: id, userId });

    if (!memory) {
        throw new ApiError(404, 'Memory not found');
    }

    return res.status(200).json(
        new ApiResponse(200, null, 'Memory deleted successfully')
    );
});

// Get memories by tag
const getMemoriesByTag = asyncHandler(async (req, res) => {
    //const { tag } = req.params;//
    const rawTag = req.params.tag; //

    
    if (!rawTag || typeof rawTag !== 'string' || !rawTag.trim()) {
        return res.status(400).json(
            new ApiResponse(400, null, "Tag parameter is missing or invalid")
        );
    }
    const tag = rawTag.trim().toLowerCase();  //
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const memories = await Memory.find({ 
        userId,
        tags: { $in: [tag] }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Memory.countDocuments({ 
        userId,
        tags: { $in: [tag] }
    });

    const responseData = {
        memories,
        tag,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalMemories: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }
    };

    return res.status(200).json(
        new ApiResponse(200, responseData, `Memories with tag '${tag}' fetched successfully`)
    );
});

// Get untagged memories
const getUntaggedMemories = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const memories = await Memory.find({ 
        userId,
        $or: [
            { tags: { $exists: false } },
            { tags: { $size: 0 } }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Memory.countDocuments({ 
        userId,
        $or: [
            { tags: { $exists: false } },
            { tags: { $size: 0 } }
        ]
    });

    const responseData = {
        memories,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalMemories: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }
    };

    return res.status(200).json(
        new ApiResponse(200, responseData, 'Untagged memories fetched successfully')
    );
});

// Get all unique tags for user
const getAllTags = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const tags = await Memory.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, tag: '$_id', count: 1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(200, tags, 'Tags fetched successfully')
    );
});

// Export memories
const exportMemories = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { format = 'json' } = req.query; // json or txt

    const memories = await Memory.find({ userId })
        .sort({ createdAt: -1 })
        .select('-userId -__v');

    if (memories.length === 0) {
        throw new ApiError(404, 'No memories found to export');
    }

    if (format === 'txt') {
        let txtContent = `My Memories Export\n${'='.repeat(50)}\n\n`;
        
        memories.forEach((memory, index) => {
            txtContent += `${index + 1}. ${memory.title || 'Untitled'}\n`;
            txtContent += `Date: ${memory.date}\n`;
            txtContent += `Tags: ${memory.tags.join(', ') || 'No tags'}\n`;
            txtContent += `Content: ${memory.content || 'No content'}\n`;
            txtContent += `${'='.repeat(30)}\n\n`;
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="memories.txt"');
        return res.send(txtContent);
    }

    // JSON format (default)
    const exportData = {
        export_date: new Date().toISOString(),
        total_memories: memories.length,
        memories: memories
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="memories.json"');
    
    return res.status(200).json(
        new ApiResponse(200, exportData, 'Memories exported successfully')
    );
});

export {
    createMemory,
    getAllMemories,
    getMemoryById,
    updateMemory,
    deleteMemory,
    getMemoriesByTag,
    getUntaggedMemories,
    getAllTags,
    exportMemories
};