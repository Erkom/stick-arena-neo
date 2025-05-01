require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

// Import models and constants
const Player = require("./server/models/Player");
const GameRoom = require("./server/models/GameRoom");
const Constants = require("./server/utils/Constants");

// Try to import database-related modules but don't crash if they fail
let db, authRoutes;
try {
  db = require("./server/db/db");
  authRoutes = require("./server/routes/auth");
} catch (error) {
  console.log("Database modules could not be loaded. Running in offline mode.");
}

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client")));

// API routes - only if database is available
if (authRoutes) {
  app.use('/api/auth', authRoutes);
}

// Serve main client page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client/index.html"));
});

// Initialize database if available
if (db) {
  db.initDatabase().catch(err => {
    console.warn('Database initialization failed, running in offline mode:', err.message);
  });
}

// Store all active players and game rooms
let players = {};
let gameRooms = {};
let nextRoomId = 1;

// Create a default game room
const defaultRoom = new GameRoom('room_1', 'Default Room');
gameRooms['room_1'] = defaultRoom;

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("a user connected: ", socket.id);

  // Associate user account with socket if token provided and database is available
  socket.on("authenticate", async (data) => {
    if (db) {
      const UserService = require("./server/services/UserService");
      const tokenResult = UserService.verifyToken(data.token);
      
      if (tokenResult.success) {
        const userResult = await UserService.getUserById(tokenResult.userId);
        if (userResult.success) {
          socket.userId = userResult.user.id;
          socket.username = userResult.user.username;
          socket.emit("authenticated", { 
            success: true, 
            username: userResult.user.username 
          });
        }
      }
    } else {
      // In offline mode, just acknowledge with the guest username
      socket.emit("authenticated", {
        success: true,
        username: data.guestUsername || "Guest"
      });
    }
  });

  // Create a new player
  players[socket.id] = new Player();
  
  // Assign random spawn point
  const randomIndex = Math.floor(Math.random() * Constants.PLAYER_SPAWN_POINTS.length);
  const spawnPoint = Constants.PLAYER_SPAWN_POINTS[randomIndex];
  players[socket.id].setPosition(spawnPoint.x, spawnPoint.y);
  
  // Add player to default room initially
  defaultRoom.addPlayer(socket.id, players[socket.id]);

  // Send current players to the new player
  socket.emit("currentPlayers", players);
  
  // Send list of available rooms
  socket.emit("roomList", Object.values(gameRooms).map(room => ({
    id: room.id,
    name: room.name,
    playerCount: Object.keys(room.players).length,
    maxPlayers: room.maxPlayers,
    status: room.status
  })));
  
  // Inform other players about the new player
  socket.broadcast.emit("newPlayer", socket.id);

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected: ", socket.id);
    
    // Remove from any game rooms
    for (const roomId in gameRooms) {
      gameRooms[roomId].removePlayer(socket.id);
    }
    
    // Remove player from global players list
    delete players[socket.id];

    // Inform other players
    io.emit("playerDisconnected", socket.id);
  });

  // Handle player movement
  socket.on("playerMovement", (movementData) => {
    // Validate the movement on server side to prevent cheating
    const player = players[socket.id];
    if (player) {
      // Check for collision with obstacles
      const newX = movementData.x;
      const newY = movementData.y;
      
      if (player.validateMovement(newX, newY, Constants.TILE_OBSTACLES, Constants.MAP_WIDTH)) {
        // If movement is valid, update player position
        player.setPosition(newX, newY, movementData.rotation);
        
        // Broadcast updated position to other players
        socket.broadcast.emit("playerMoved", {
          playerId: socket.id,
          playerPos: player.position
        });
      } else {
        // Send correction to client if movement is invalid
        socket.emit("movementRejected", {
          correctPosition: player.position
        });
      }
    }
  });

  // Handle shooting
  socket.on("playedShoot", () => {
    socket.broadcast.emit("playShoot", {
      playerId: socket.id
    });
  });

  // Handle walking animation
  socket.on("playedWalkingAnimation", (walkingInfo) => {
    socket.broadcast.emit("playWalkingAnimation", {
      playerId: socket.id,
      rotation: walkingInfo.rotation,
      isRunning: walkingInfo.isRunning
    });
  });

  // Handle hit detection
  socket.on("playerHit", (data) => {
    const targetPlayerId = data.playerId;
    const shooter = players[socket.id];
    const target = players[targetPlayerId];
    
    if (!target || !shooter) return;
    
    // Validate the hit on the server-side to prevent cheating
    // Check if target is in range and there are no obstacles between them
    if (gameRooms['room_1'].checkCollision(shooter, target.position)) {
      // Calculate damage based on weapon
      const damage = Constants.WEAPON_DAMAGE[shooter.getWeapon()] || 20;
      
      // Apply damage to target
      const isDead = target.takeDamage(damage);
      
      if (isDead) {
        // Player died
        io.emit("playerDied", {
          playerId: targetPlayerId
        });
        
        // Respawn the player after a delay
        setTimeout(() => {
          if (players[targetPlayerId]) {
            const newPos = target.respawn(Constants.PLAYER_SPAWN_POINTS);
            io.emit("playerRespawned", {
              playerId: targetPlayerId,
              position: newPos
            });
          }
        }, 3000);
      } else {
        // Player got hit but is still alive
        io.emit("playerGotHit", {
          playerId: targetPlayerId,
          health: target.health
        });
      }
    }
  });

  // Handle weapon pickup
  socket.on("tryPickupWeapon", (data) => {
    const weaponId = data.weaponId;
    const room = gameRooms['room_1']; // Assuming player is in default room
    
    const weaponType = room.pickupWeapon(socket.id, weaponId);
    if (weaponType) {
      // Inform all players that this weapon was picked up
      io.emit("weaponPickedUp", {
        weaponId: weaponId,
        playerId: socket.id,
        weaponType: weaponType
      });
    }
  });

  // Handle room creation
  socket.on("createRoom", (data) => {
    const roomId = `room_${nextRoomId++}`;
    const newRoom = new GameRoom(roomId, data.roomName, data.maxPlayers);
    gameRooms[roomId] = newRoom;
    
    // Inform all players about the new room
    io.emit("roomCreated", {
      id: roomId,
      name: newRoom.name,
      playerCount: 0,
      maxPlayers: newRoom.maxPlayers,
      status: newRoom.status
    });
  });

  // Handle player joining a room
  socket.on("joinRoom", (data) => {
    const roomId = data.roomId;
    const room = gameRooms[roomId];
    
    if (room && room.addPlayer(socket.id, players[socket.id])) {
      // Remove player from current room
      for (const id in gameRooms) {
        if (id !== roomId) {
          gameRooms[id].removePlayer(socket.id);
        }
      }
      
      // Inform player they've joined successfully
      socket.emit("joinedRoom", {
        roomId: roomId,
        roomName: room.name,
        players: room.getPlayers()
      });
      
      // Update room player count for everyone
      io.emit("roomUpdated", {
        id: roomId,
        playerCount: Object.keys(room.players).length
      });
    } else {
      // Inform player that joining failed
      socket.emit("joinRoomFailed", {
        roomId: roomId,
        reason: "Room is full or doesn't exist"
      });
    }
  });

  // Handle starting a game
  socket.on("startGame", (data) => {
    const roomId = data.roomId;
    const room = gameRooms[roomId];
    
    if (room && room.status === 'waiting') {
      const endTime = room.startGame();
      
      // Inform all players in the room that the game has started
      io.emit("gameStarted", {
        roomId: roomId,
        endTime: endTime,
        players: room.getPlayers()
      });
      
      // Set a timer to end the game
      setTimeout(() => {
        if (gameRooms[roomId] && gameRooms[roomId].status === 'playing') {
          const gameResult = room.endGame();
          
          // Inform all players that the game has ended
          io.emit("gameEnded", {
            roomId: roomId,
            result: gameResult
          });
        }
      }, room.gameTimeLimit);
    }
  });

  // Handle player respawn
  socket.on("playerMoved", (data) => {
    if (data.isRespawning) {
      players[socket.id].health = 100;
      players[socket.id].isRespawning = false;
    }
    
    players[socket.id].setPosition(data.x, data.y, data.rotation);
    
    socket.broadcast.emit("playerMoved", {
      playerId: socket.id,
      playerPos: players[socket.id].position
    });
  });

  // Add chat message handler
  socket.on("chatMessage", (data) => {
    // Broadcast the message to all connected clients
    io.emit("chatMessage", {
      username: data.username || "Guest",
      message: data.message
    });
  });

  // Get room list
  socket.on("getRoomList", () => {
    socket.emit("roomList", Object.values(gameRooms).map(room => ({
      id: room.id,
      name: room.name,
      playerCount: Object.keys(room.players).length,
      maxPlayers: room.maxPlayers,
      status: room.status
    })));
  });

  // Handle leaving a room
  socket.on("leaveRoom", (data) => {
    const roomId = data.roomId;
    if (gameRooms[roomId]) {
      gameRooms[roomId].removePlayer(socket.id);
      
      // Add player back to default room
      defaultRoom.addPlayer(socket.id, players[socket.id]);
      
      // Update room player count for everyone
      io.emit("roomUpdated", {
        id: roomId,
        playerCount: Object.keys(gameRooms[roomId].players).length
      });
    }
  });
});

server.listen(process.env.PORT || 1138, () => {
  console.log(`Listening on ${server.address().port}`);
});
