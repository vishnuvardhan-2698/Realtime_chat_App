import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },
});

// used to store online users
const userSocketMap = new Map(); // Using Map instead of plain object for better key-value handling

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId);
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (!userId) {
    console.error("No userId provided in socket connection");
    socket.disconnect();
    return;
  }

  userSocketMap.set(userId, socket.id);

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    userSocketMap.delete(userId);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

export { io, app, server };
