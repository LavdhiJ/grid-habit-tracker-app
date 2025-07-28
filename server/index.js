

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";import { createServer } from 'http';
import { Server } from 'socket.io';
import SocketService from './services/SocketService.js';
dotenv.config({
  path: "./.env" 
});
const server = createServer(app);

// Attach Socket.IO to server
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
  }
});

// Initialize socket service
SocketService.initialize(io);

connectDB()

.then(()=>{
    app.listen(process.env.PORT || 5000 , () =>{
        console.log(`server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) =>{
    console.log("db connection not done",err);}
)
export { io };