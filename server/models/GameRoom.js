const Player = require('./Player');
const Constants = require('../utils/Constants');

class GameRoom {
  constructor(id, name, maxPlayers = 8) {
    this.id = id;
    this.name = name;
    this.players = {};
    this.maxPlayers = maxPlayers;
    this.status = 'waiting'; // waiting, playing, ended
    this.startTime = null;
    this.endTime = null;
    this.gameTimeLimit = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.weaponsOnGround = [];
  }

  addPlayer(playerId, player) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      return false;
    }
    this.players[playerId] = player;
    return true;
  }

  removePlayer(playerId) {
    if (this.players[playerId]) {
      delete this.players[playerId];
      return true;
    }
    return false;
  }

  getPlayers() {
    return this.players;
  }

  startGame() {
    this.status = 'playing';
    this.startTime = Date.now();
    this.endTime = this.startTime + this.gameTimeLimit;
    this.spawnWeapons();
    return this.endTime;
  }

  endGame() {
    this.status = 'ended';
    return {
      players: this.players,
      timeElapsed: Date.now() - this.startTime
    };
  }

  isGameOver() {
    return Date.now() >= this.endTime || this.status === 'ended';
  }

  getRemainingTime() {
    if (this.status !== 'playing') return 0;
    return Math.max(0, this.endTime - Date.now());
  }

  spawnWeapons() {
    // Implementation for spawning weapons in the game room
    const weaponTypes = ['glock', 'bat', 'ak47', 'shotgun', 'hammer'];
    const spawnPoints = Constants.WEAPON_SPAWN_POINTS || [];
    
    this.weaponsOnGround = spawnPoints.map((spawnPoint, index) => {
      const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
      return {
        id: `weapon_${this.id}_${index}`,
        type: weaponType,
        position: { x: spawnPoint.x, y: spawnPoint.y },
        isPickedUp: false
      };
    });
  }

  pickupWeapon(playerId, weaponId) {
    const weaponIndex = this.weaponsOnGround.findIndex(w => w.id === weaponId);
    if (weaponIndex >= 0 && !this.weaponsOnGround[weaponIndex].isPickedUp) {
      const weapon = this.weaponsOnGround[weaponIndex];
      this.weaponsOnGround[weaponIndex].isPickedUp = true;
      
      // Update player's weapon
      if (this.players[playerId]) {
        this.players[playerId].setWeapon(weapon.type);
      }
      
      return weapon.type;
    }
    return null;
  }

  checkCollision(shooter, targetPos) {
    // Basic distance-based collision detection
    const shooterPos = shooter.position;
    const distance = Math.sqrt(
      Math.pow(shooterPos.x - targetPos.x, 2) + 
      Math.pow(shooterPos.y - targetPos.y, 2)
    );
    
    // Check for obstacles between shooter and target
    // Simple version - more complex would check actual tiles on the path
    return distance <= Constants.SHOOT_RANGE;
  }
}

module.exports = GameRoom;