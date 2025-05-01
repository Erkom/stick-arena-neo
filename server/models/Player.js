class Player {
  constructor() {
    this.position = { x: 0, y: 0, rotation: 0 };
    this.health = 100;
    this.weapon = "glock"; // Default weapon
    this.isRespawning = false;
    this.lastAction = Date.now();
    this.isMoving = false;
    this.moveDirection = null;
  }

  setPosition(x, y, rotation) {
    this.position.x = x;
    this.position.y = y;
    if (rotation !== undefined) {
      this.position.rotation = rotation;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isRespawning = true;
      return true; // Player died
    }
    return false; // Player still alive
  }

  respawn(spawnPoints) {
    const randomIndex = Math.floor(Math.random() * spawnPoints.length);
    const { x, y } = spawnPoints[randomIndex];
    this.position.x = x;
    this.position.y = y;
    this.health = 100;
    this.isRespawning = false;
    return { x, y };
  }

  setWeapon(weaponName) {
    this.weapon = weaponName;
  }

  getWeapon() {
    return this.weapon;
  }

  // Check if movement is valid (no collision with obstacles)
  validateMovement(newX, newY, tileObstacles, mapWidth) {
    const tileX = Math.floor(newX / 50);
    const tileY = Math.floor(newY / 50);
    const tileIndex = tileY * mapWidth + tileX;
    
    return tileObstacles[tileIndex] !== 1;
  }
}

module.exports = Player;
