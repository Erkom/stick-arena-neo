// Game Room View Component
class GameRoomView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'game-room';
    this.roomData = null;
    this.players = {};
    this.timer = null;
    this.isSoundEnabled = true;
    this.onLeaveRoom = null;
  }

  // Set the room data
  setRoomData(roomData) {
    this.roomData = roomData;
    this.render();
  }

  // Update player list
  updatePlayers(players) {
    this.players = players;
    this.renderPlayerList();
  }

  // Update the game timer
  updateTimer(timeRemaining) {
    if (!this.timer) return;
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    this.timer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    // Flash timer when it's getting low
    if (timeRemaining < 30000) {
      this.timer.style.color = '#ff5252';
      if (timeRemaining < 10000) {
        this.timer.style.animation = 'blink 0.5s linear infinite';
      }
    }
  }

  // Set callback for leaving room
  setLeaveRoomCallback(callback) {
    this.onLeaveRoom = callback;
  }

  // Handle leaving the room
  handleLeaveRoom() {
    socketManager.emit('leaveRoom', { roomId: this.roomData.roomId });
    
    if (this.onLeaveRoom) {
      this.onLeaveRoom();
    }
  }

  // Toggle sound
  toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    
    // Update sound button icon
    const soundBtn = this.container.querySelector('#soundBtn');
    if (soundBtn) {
      soundBtn.innerHTML = this.isSoundEnabled ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
    }
    
    // Enable/disable sound
    if (window.audioManager) {
      window.audioManager.setMuted(!this.isSoundEnabled);
    }
  }

  // Render player list
  renderPlayerList() {
    const playerList = this.container.querySelector('.player-list');
    if (!playerList) return;

    playerList.innerHTML = '<h3>Players</h3>';

    for (const id in this.players) {
      const player = this.players[id];
      const playerItem = document.createElement('div');
      playerItem.className = 'player-item';
      
      // Determine if this is the current player
      const isCurrentPlayer = id === socketManager.socket.id;
      
      playerItem.innerHTML = `
        <span>${player.name || 'Player'} ${isCurrentPlayer ? '(You)' : ''}</span>
        <span>${player.health} HP</span>
      `;
      
      playerList.appendChild(playerItem);
    }
  }

  // Render the game room view
  render() {
    this.container.innerHTML = `
      <div class="game-canvas-container">
        <canvas id="canvas" width="960" height="720"></canvas>
        
        <div class="timer" id="gameTimer">5:00</div>
        
        <div class="player-list">
          <!-- Player list will be inserted here -->
        </div>
        
        <div class="weapons-ui">
          <div class="weapon-slot active">
            <img src="sprites/glock/glock-stance.png" alt="Glock" width="40">
          </div>
          <!-- More weapon slots can be added here -->
        </div>
      </div>
      
      <div class="game-controls">
        <div>
          <button class="btn btn-secondary" id="leaveRoomBtn">Leave Room</button>
          <span class="sound-control" id="soundBtn">
            <i class="fas fa-volume-up"></i>
          </span>
        </div>
        
        <div>
          <span>Room: ${this.roomData ? this.roomData.roomName : 'Game Room'}</span>
        </div>
      </div>
    `;

    // Add event listeners
    const leaveRoomBtn = this.container.querySelector('#leaveRoomBtn');
    if (leaveRoomBtn) {
      leaveRoomBtn.addEventListener('click', this.handleLeaveRoom.bind(this));
    }

    const soundBtn = this.container.querySelector('#soundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', this.toggleSound.bind(this));
    }

    // Store reference to timer element
    this.timer = this.container.querySelector('#gameTimer');

    // Render player list
    this.renderPlayerList();

    return this.container;
  }
}

// Export the game room view
window.GameRoomView = GameRoomView;