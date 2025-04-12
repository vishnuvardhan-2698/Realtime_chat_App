import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validate required fields
    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

    if (!text && !image) {
      return res.status(400).json({ error: "Message content is required" });
    }

    let imageUrl;
    if (image) {
      try {
        // Upload base64 image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: "auto",
          folder: "chat-app",
          max_file_size: 5 * 1024 * 1024, // 5MB limit
        });
        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        return res.status(400).json({
          error: "Failed to upload image. Please check your Cloudinary configuration or try a smaller image."
        });
      }
    }

    const message = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await message.save();

    // Send the message to the receiver if they are online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
