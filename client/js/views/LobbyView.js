// Lobby View Component
class LobbyView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'lobby-container';
    this.rooms = [];
    this.user = null;
    this.onJoinRoom = null;
    this.chatMessages = [];
  }

  // Set the user data
  setUser(user) {
    this.user = user;
    this.render();
  }

  // Set callback for joining a room
  setJoinRoomCallback(callback) {
    this.onJoinRoom = callback;
  }

  // Update the room list
  updateRooms(rooms) {
    this.rooms = rooms;
    this.renderRoomList();
  }

  // Add a chat message
  addChatMessage(message) {
    this.chatMessages.push(message);
    this.renderChatMessages();
  }

  // Handle creating a new room
  handleCreateRoom() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Create New Room</h3>
          <span class="modal-close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <input type="text" class="form-control" id="roomName" placeholder="Room Name" required>
          </div>
          <div class="form-group">
            <select class="form-control" id="maxPlayers">
              <option value="4">4 Players</option>
              <option value="8" selected>8 Players</option>
              <option value="12">12 Players</option>
              <option value="16">16 Players</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="createRoomBtn">Create Room</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#createRoomBtn').addEventListener('click', () => {
      const roomName = modal.querySelector('#roomName').value;
      const maxPlayers = modal.querySelector('#maxPlayers').value;

      if (roomName.trim() === '') {
        alert('Please enter a room name');
        return;
      }

      // Emit socket event to create room
      socketManager.emit('createRoom', {
        roomName: roomName,
        maxPlayers: parseInt(maxPlayers)
      });

      document.body.removeChild(modal);
    });
  }

  // Handle sending a chat message
  handleSendMessage(event) {
    const input = this.container.querySelector('#chatInput');
    const message = input.value.trim();

    if (message !== '') {
      // Emit socket event to send message
      socketManager.emit('chatMessage', {
        message: message,
        username: this.user.username
      });

      // Clear input
      input.value = '';
    }
  }

  // Handle joining a room
  handleJoinRoom(roomId) {
    socketManager.emit('joinRoom', { roomId });
    
    // Call join room callback
    if (this.onJoinRoom) {
      this.onJoinRoom(roomId);
    }
  }

  // Render the room list
  renderRoomList() {
    const roomList = this.container.querySelector('.room-list-content');
    if (!roomList) return;

    roomList.innerHTML = '';

    if (this.rooms.length === 0) {
      roomList.innerHTML = '<p>No rooms available. Create a new room to play!</p>';
      return;
    }

    this.rooms.forEach(room => {
      const roomItem = document.createElement('div');
      roomItem.className = 'room-item';
      roomItem.innerHTML = `
        <div>
          <div class="room-name">${room.name}</div>
          <div class="room-info">
            <span>${room.playerCount}/${room.maxPlayers} players</span>
            <span class="room-status-${room.status}">${room.status}</span>
          </div>
        </div>
        <button class="btn btn-primary join-room-btn" data-room-id="${room.id}">
          ${room.status === 'playing' ? 'Spectate' : 'Join'}
        </button>
      `;

      roomList.appendChild(roomItem);

      // Add event listener
      roomItem.querySelector('.join-room-btn').addEventListener('click', () => {
        this.handleJoinRoom(room.id);
      });
    });
  }

  // Render chat messages
  renderChatMessages() {
    const chatMessages = this.container.querySelector('.chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = '';

    this.chatMessages.forEach(msg => {
      const messageElement = document.createElement('div');
      messageElement.className = 'chat-message';
      messageElement.innerHTML = `
        <strong>${msg.username}:</strong> ${msg.message}
      `;
      chatMessages.appendChild(messageElement);
    });

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Render the lobby view
  render() {
    this.container.innerHTML = `
      <div class="game-header">
        <div class="header-content">
          <div class="user-info">
            <span class="username">${this.user ? this.user.username : 'Guest'}</span>
            ${this.user && this.user.creds !== undefined ? 
              `<span class="creds">${this.user.creds} Creds</span>` : ''}
          </div>
          <button class="btn btn-secondary" id="logoutBtn">Logout</button>
        </div>
      </div>
      <div class="lobby-content">
        <div class="room-list">
          <h3>Game Rooms</h3>
          <div class="room-list-content">
            <!-- Room items will be inserted here -->
          </div>
          <button class="btn btn-primary create-room-btn" id="createRoomBtn">Create Room</button>
        </div>
        <div class="chat-box">
          <h3>Global Chat</h3>
          <div class="chat-messages">
            <!-- Chat messages will be inserted here -->
          </div>
          <div class="chat-input-container">
            <input type="text" class="form-control chat-input" id="chatInput" placeholder="Type a message...">
            <button class="btn btn-primary chat-send" id="sendMessageBtn">Send</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const createRoomBtn = this.container.querySelector('#createRoomBtn');
    if (createRoomBtn) {
      createRoomBtn.addEventListener('click', this.handleCreateRoom.bind(this));
    }

    const sendMessageBtn = this.container.querySelector('#sendMessageBtn');
    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', this.handleSendMessage.bind(this));
    }

    const chatInput = this.container.querySelector('#chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleSendMessage(e);
        }
      });
    }

    const logoutBtn = this.container.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Reload the page to go back to login
        window.location.reload();
      });
    }

    // Render room list and chat messages
    this.renderRoomList();
    this.renderChatMessages();

    return this.container;
  }
}

// Export the lobby view
window.LobbyView = LobbyView;