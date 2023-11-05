const http = require("http");
const express = require("express");
const cors = require("cors");
const socketIO = require("socket.io");

const app = express();
app.use(cors());
const port = 4500;

const server = http.createServer(app);
const io = socketIO(server);


// Define an object to store room data
const rooms = {};
app.get('/' , (req , res)=>{
  console.log("got a req");
  res.send(rooms);
})

io.on("connection", (socket) => {
  console.log("New Connection");

  socket.on("joined", (data) => {
    const { user, roomId } = data;

    // Check if the room exists in the rooms object
    if (!rooms[roomId]) {
      // If the room doesn't exist, create it and initialize an empty array for users
      rooms[roomId] = { users: [] };
    }

    // Check if the room has less than two users
    if (rooms[roomId].users.length < 2) {
      // Add the user to the room
      rooms[roomId].users.push({ socketId: socket.id, username: user });
      console.log(user + " joined room " + roomId);

      // Notify the user that they've successfully joined
      socket.emit("joined", { user, roomId });

      // Notify other users in the room about the new user
      socket.to(roomId).emit("userJoined", {
        user: "Admin",
        message: `${user} has joined`,
      });

      // Join the user to a room with the specified ID
      socket.join(roomId);
      if(rooms[roomId].users.length == 2){
          io.to(roomId).emit("allusersdata", {
            allusers : rooms[roomId].users,
          });
      }
      socket.on("gameWinner"  , (data)=>{
         const{winner , roomId} = data;
         console.log(winner);
         io.to(roomId).emit("winner" , {
           winner: winner,
         })
      });
    } else {
      // The room is full
      socket.emit("roomFull", { user, roomId });
    }
  });

  socket.on("disconnect", () => {
    // Find the room containing the disconnected user
    for (const roomId in rooms) {
      const usersInRoom = rooms[roomId].users;
      const userIndex = usersInRoom.findIndex(
        (user) => user.socketId === socket.id
      );

      if (userIndex !== -1) {
        const disconnectedUser = usersInRoom[userIndex];
        usersInRoom.splice(userIndex, 1);

        socket.to(roomId).emit("leave", {
          user: "Admin",
          message: `${disconnectedUser.username} has left`,
        });

        console.log(`${disconnectedUser.username} left room ${roomId}`);

        if (usersInRoom.length === 0) {
          // If there are no more users in the room, remove the room
          delete rooms[roomId];
        }

        break;
      }
    }
    
  });
socket.on("updateGame", (data) => {
  const { roomId } = data;
  socket.to(roomId).emit("updateGame", data);
});
});

server.listen(port, () => {
  console.log(`Server is listening on port http://localhost:${port}`);
});
