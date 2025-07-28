import Notification from '../models/notification.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

class SocketService {
  static io = null;
  static connectedUsers = new Map(); // userId -> socketId

  static initialize(io) {
    this.io = io;
    
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Handle user authentication and room joining
      socket.on('authenticate', asyncHandler(async (data) => {
        const { userId } = data;
        
        if (!userId) {
          throw new ApiError(400, 'User ID is required for authentication');
        }
        
        // Store user connection
        this.connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        
        // Join user to their personal room
        socket.join(userId);
        
        console.log(`User ${userId} authenticated and joined room`);
        
        // Send success response
        socket.emit('authenticated', new ApiResponse(200, { userId }, 'Authentication successful'));
        
        // Send pending notifications
        await this.sendPendingNotifications(userId);
      }));
      
      // Handle notification read
      socket.on('notification_read', asyncHandler(async (data) => {
        const { notificationId } = data;
        
        if (!notificationId) {
          throw new ApiError(400, 'Notification ID is required');
        }
        
        const notification = await Notification.findByIdAndUpdate(
          notificationId, 
          { read: true },
          { new: true }
        );
        
        if (!notification) {
          throw new ApiError(404, 'Notification not found');
        }
        
        console.log(`Notification ${notificationId} marked as read`);
        
        socket.emit('notification_read_success', 
          new ApiResponse(200, { notificationId }, 'Notification marked as read')
        );
      }));
      
      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });
      
      // Handle socket errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        socket.emit('socket_error', new ApiResponse(500, null, 'Socket connection error'));
      });
    });
  }
  
  static async sendToUser(userId, event, data) {
    if (!this.io) {
      throw new ApiError(500, 'Socket.IO not initialized');
    }
    
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }
    
    const socketId = this.connectedUsers.get(userId);
    
    if (socketId) {
      // User is online, send directly
      this.io.to(userId).emit(event, data);
      console.log(`Sent ${event} to user ${userId}`);
      return true;
    }
    
    return false; // User offline
  }
  
  static storeOfflineNotification = asyncHandler(async (userId, notificationData) => {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }
    
    if (!notificationData || !notificationData.title || !notificationData.message) {
      throw new ApiError(400, 'Notification data with title and message is required');
    }
    
    const notification = new Notification({
      userId,
      type: notificationData.type || 'reminder',
      entityType: notificationData.entityType,
      entityId: notificationData.entityId,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'medium',
      delivered: false
    });
    
    const savedNotification = await notification.save();
    console.log(`Stored offline notification for user ${userId}`);
    return savedNotification;
  });
  
  static sendPendingNotifications = asyncHandler(async (userId) => {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }
    
    const pendingNotifications = await Notification.find({
      userId,
      delivered: false
    }).sort({ createdAt: 1 });
    
    if (pendingNotifications.length === 0) {
      console.log(`No pending notifications for user ${userId}`);
      return;
    }
    
    for (const notification of pendingNotifications) {
      const notificationData = {
        id: notification._id,
        type: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        timestamp: notification.createdAt
      };
      
      // Send as 'reminder_notification' event
      this.io.to(userId).emit('reminder_notification', notificationData);
      
      // Mark as delivered
      notification.delivered = true;
      notification.deliveredAt = new Date();
      await notification.save();
    }
    
    console.log(`Sent ${pendingNotifications.length} pending notifications to user ${userId}`);
  });
  
  static getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }
  
  static isUserOnline(userId) {
    if (!userId) {
      return false;
    }
    return this.connectedUsers.has(userId);
  }
  
  static getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: this.getConnectedUsers()
    };
  }
}

export default SocketService;