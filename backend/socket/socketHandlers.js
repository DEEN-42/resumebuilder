import Resume from "../models/resumeDatamodel.js";
import {
  addUserToResume,
  removeUserFromResume,
  getUsersInResume,
} from "../RedisHelperFunctions/redisHelperFunctions.js";
export const handleSocketConnection = (io, socket, redisClient) => {
  // console.log(`User connected: ${socket.userEmail}`);

  // Helper function to check if user has access to resume
  const hasAccess = (resume, userEmail) => {
    return (
      resume.owner === userEmail ||
      resume.shared.some((sharedUser) => sharedUser.email === userEmail)
    );
  };

  // Join resume room
  socket.on("join-resume-room", async (id) => {
    try {
      // console.log(`Attempting to join resume room: ${id} for user: ${socket.userEmail}`);

      // Verify user has access to this resume - using findOne with custom id
      const resume = await Resume.findOne({ id });

      if (!resume) {
        // console.log(`Resume not found: ${id}`);
        socket.emit("error", { message: "Resume not found" });
        return;
      }

      // Fixed: Check shared users correctly
      if (!hasAccess(resume, socket.userEmail)) {
        // console.log(`Access denied for user: ${socket.userEmail} to resume: ${id}`);
        socket.emit("error", { message: "Access denied" });
        return;
      }

      // Join the room
      socket.join(id);
      socket.currentResumeId = id;

      // Get all users currently in the room
      await addUserToResume(redisClient, id, socket.userEmail);
      const usersInRoom = await getUsersInResume(redisClient, id);

      // Notify others in the room that a new user joined
      socket.to(id).emit("user-joined", {
        userEmail: socket.userEmail,
        message: `${socket.userEmail} joined the resume`,
      });

      // Send current users list to all the users
      io.to(id).emit("users-in-room", usersInRoom);

      // Send current resume data to the joining user
      socket.emit("resume-loaded", { resume });

      // console.log(`User ${socket.userEmail} joined resume room: ${id}`);
      // console.log(`Current users in room ${id}:`, usersInRoom);
    } catch (error) {
      console.error("Error joining resume room:", error);
      socket.emit("error", { message: "Failed to join resume room" });
    }
  });

  // Handle resume updates — DEPRECATED: data sync now handled by Yjs CRDT.
  // Kept as a no-op so older clients do not crash; the real-time path is /yjs WS.
  socket.on("update-resume", () => {
    socket.emit("error", {
      message: "update-resume is deprecated. Use the Yjs WebSocket connection for real-time sync.",
    });
  });

  // Handle leaving resume room
  socket.on("leave-resume", async (id) => {
    socket.leave(id);
    await removeUserFromResume(redisClient, id, socket.userEmail);

    // Notify others in the room
    socket.to(id).emit("user-left", {
      userEmail: socket.userEmail,
      message: `${socket.userEmail} left the resume`,
    });

    // Get updated users list and broadcast to remaining users
    const usersInRoom = await getUsersInResume(redisClient, id);

    // Send updated users list to remaining users in room
    io.to(id).emit("users-in-room", usersInRoom);

    if (socket.currentResumeId === id) {
      socket.currentResumeId = null;
    }

    // console.log(`User ${socket.userEmail} left resume room: ${id}`);
    // console.log(`Remaining users in room ${id}:`, usersInRoom);
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    if (socket.currentResumeId) {
      // Notify others in the room
      await removeUserFromResume(
        redisClient,
        socket.currentResumeId,
        socket.userEmail
      );
      socket.to(socket.currentResumeId).emit("user-left", {
        userEmail: socket.userEmail,
        message: `${socket.userEmail} disconnected`,
      });

      // Get updated users list and broadcast to remaining users
      const usersInRoom = await getUsersInResume(
        redisClient,
        socket.currentResumeId
      );

      // Send updated users list to remaining users in room
      io.to(socket.currentResumeId).emit("users-in-room", usersInRoom);

      // console.log(`User ${socket.userEmail} disconnected from resume room: ${socket.currentResumeId}`);
      // console.log(`Remaining users in room ${socket.currentResumeId}:`, usersInRoom);
    }

    // console.log(`User disconnected: ${socket.userEmail}`);
  });
};
