let canvas;
let ctx;
let scaleFactor;
let gameInitialized = false;
let gameMap;
let tiles = {};
let tilemap;

// Set up the main game
function setupGame() {
  // If the game is already initialized, just reset the state
  if (gameInitialized) {
    resetGameState();
    return;
  }

  // Get the canvas element and context
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // Calculate scale factor based on canvas size
  scaleFactor = Math.min(canvas.width / 800, canvas.height / 600);

  // Load the tilemap
  tilemap = Constants.TILEMAP;

  // Load map image
  gameMap = new Image();
  gameMap.src = "sprites/maps/open-space.png";

  // Set up event listeners
  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);
  document.addEventListener("blur", onBlurHandler);
  canvas.addEventListener("mousemove", mouseMoveHandler, false);
  canvas.addEventListener("mousedown", onMouseDown);

  // Watch for canvas size changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "width" || mutation.attributeName === "height") {
        scaleFactor = Math.min(canvas.width / 800, canvas.height / 600);
      }
    });
  });

  observer.observe(canvas, { attributes: true });

  // Create main player and initialize the game
  playerManager.createMainPlayer();
  loadTiles();
  
  // Start the game loop
  requestAnimationFrame(gameLoop);
  
  // Mark the game as initialized
  gameInitialized = true;
  
  // Setup socket event handlers for the game
  setupSocketHandlers();
}

// Reset the game state when rejoining
function resetGameState() {
  // Reset player positions and state
  playerManager.mainPlayer.health = 100;
  playerManager.mainPlayer.isRespawning = false;
  playerManager.mainPlayer.canShoot = true;
  playerManager.mainPlayer.canMove = true;
  
  // Assign random spawn point
  const randomIndex = Math.floor(Math.random() * Constants.PLAYER_SPAWN_POINTS.length);
  const { x, y } = Constants.PLAYER_SPAWN_POINTS[randomIndex];
  playerManager.mainPlayer.setPosition(x, y);
  
  // Reset camera position
  camera.setPos(playerManager.mainPlayer.body);
  
  // Notify server of new position
  socketManager.emit("playerMoved", { x: x, y: y });
}

// Load map tiles
function loadTiles() {
  for (const tileIndex in tilemap) {
    const rawTile = tilemap[tileIndex];
    const tileImg = new Image();
    tileImg.src = `sprites/maps/xgenhq/${rawTile}.png`;
    tiles[rawTile] = tileImg;
  }
}

// Draw the game map
function drawMap() {
  const tileSize = 50;
  const mapWidth = 35;
  const mapHeight = 24;

  // Only draw tiles that are visible on screen for performance
  const startX = Math.max(0, Math.floor(camera.x / (tileSize * scaleFactor)));
  const startY = Math.max(0, Math.floor(camera.y / (tileSize * scaleFactor)));
  const endX = Math.min(mapWidth, startX + Math.ceil(canvas.width / (tileSize * scaleFactor)) + 1);
  const endY = Math.min(mapHeight, startY + Math.ceil(canvas.height / (tileSize * scaleFactor)) + 1);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = tilemap[y * mapWidth + x];
      ctx.drawImage(tiles[tile], x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

// Draw player health bar
function drawHealthBar() {
  if (!playerManager.mainPlayer) return;
  
  let x = 50;
  let y = 15;
  const width = 100;
  const height = 20;
  const health = playerManager.mainPlayer.health;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (playerManager.mainPlayer.healthbarHeart) {
    playerManager.mainPlayer.healthbarHeart.draw(ctx);
  }
  ctx.fillStyle = 'red';
  ctx.fillRect(x, y, health, height);
  ctx.fillStyle = 'black';
  ctx.fillRect(health + x, y, width - health, height);
  ctx.restore();
}

// Draw all HUD elements
function drawHUD() {
  drawHealthBar();
  
  // Draw additional HUD elements like ammo, current weapon, etc.
}

// Draw weapons on the ground
function drawWeapons() {
  // Get weapons from the socket or game state
  // For each weapon on ground, draw its sprite
}

// Update game state
function update() {
  if (!playerManager.mainPlayer) return;
  
  playerManager.updatePlayers();
  
  // Handle input events that affect movement
  handlePlayerMovement();
}

// Handle player movement based on key states
function handlePlayerMovement() {
  if (!playerManager.mainPlayer || playerManager.mainPlayer.isRespawning) return;
  
  keyEvents();
}

// Set up socket handlers for game events
function setupSocketHandlers() {
  // Handle correction of invalid movement from server
  socketManager.on("movementRejected", (data) => {
    if (playerManager.mainPlayer) {
      playerManager.mainPlayer.setPosition(
        data.correctPosition.x,
        data.correctPosition.y,
        data.correctPosition.rotation
      );
    }
  });
  
  // Handle weapon pickup notifications
  socketManager.on("weaponPickedUp", (data) => {
    // Update weapon in the game world
    // Play pickup sound
    if (data.playerId === socketManager.socket.id) {
      // It was us who picked up the weapon
      window.audioManager.play('ui-click', 0.5);
    }
  });
  
  // Handle player spawn events
  socketManager.on("playerRespawned", (data) => {
    if (data.playerId === socketManager.socket.id) {
      // Our player respawned
      playerManager.mainPlayer.setPosition(data.position.x, data.position.y);
      playerManager.mainPlayer.health = 100;
      window.audioManager.play('player-respawn', 0.7);
    } else {
      // Another player respawned
      const player = playerManager.getPlayer(data.playerId);
      if (player) {
        player.setPosition(data.position.x, data.position.y);
      }
    }
  });
}

// Draw the game scene
function draw() {
  // Clear the canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Apply camera transformation
  ctx.translate(-camera.x, -camera.y);
  ctx.scale(scaleFactor, scaleFactor);

  // Draw game elements
  drawMap();
  drawWeapons();
  playerManager.drawPlayers(ctx);
  drawHUD();
}

// Main game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Make setup function available globally
window.setupGame = setupGame;
