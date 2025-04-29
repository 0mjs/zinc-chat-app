document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const loginContainer = document.getElementById('loginContainer');
  const chatContainer = document.getElementById('chatContainer');
  const roomBtns = document.querySelectorAll('.room-btn');
  const joinCustomRoomBtn = document.getElementById('joinCustomRoom');
  const customRoomInput = document.getElementById('customRoom');
  const usernameInput = document.getElementById('username');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const messagesContainer = document.getElementById('messages');
  const roomNameDisplay = document.getElementById('roomName');
  const userDisplay = document.getElementById('userDisplay');
  const leaveRoomBtn = document.getElementById('leaveRoom');

  // Chat state
  let websocket = null;

  // Join a room when clicking a room button
  roomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.getAttribute('data-room');
      const username = usernameInput.value.trim();

      if (!username) {
        alert('Please enter your name');
        usernameInput.focus();
        return;
      }

      joinRoom(username, room);
    });
  });

  // Join a custom room
  joinCustomRoomBtn.addEventListener('click', () => {
    const room = customRoomInput.value.trim();
    const username = usernameInput.value.trim();

    if (!username) {
      alert('Please enter your name');
      usernameInput.focus();
      return;
    }

    if (!room) {
      alert('Please enter a room name');
      customRoomInput.focus();
      return;
    }

    joinRoom(username, room);
  });

  // Send a message
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = messageInput.value.trim();
    if (!message || !websocket) return;

    const chatMessage = {
      type: 'chat',
      message: message
    };

    websocket.send(JSON.stringify(chatMessage));
    messageInput.value = '';
  });

  // Leave the room
  leaveRoomBtn.addEventListener('click', () => {
    if (websocket) {
      websocket.close();
    }
  });

  // Join a chat room
  function joinRoom(username, room) {
    currentUser = username;
    currentRoom = room;

    // Update UI
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
    roomNameDisplay.textContent = room;
    userDisplay.textContent = username;
    messagesContainer.innerHTML = '';

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${room}/${username}`;

    websocket = new WebSocket(wsUrl);

    // WebSocket event handlers
    websocket.onopen = () => {
      console.log('Connected to WebSocket');
      addMessage({
        type: 'system',
        message: 'Connected to chat'
      });
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addMessage(data);
    };

    websocket.onclose = () => {
      console.log('Disconnected from WebSocket');
      addMessage({
        type: 'system',
        message: 'Disconnected from chat'
      });

      // Return to login screen after a small delay
      setTimeout(() => {
        loginContainer.style.display = 'block';
        chatContainer.style.display = 'none';
        websocket = null;
      }, 1000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage({
        type: 'error',
        message: 'WebSocket error occurred'
      });
    };
  }

  // Add a message to the chat
  function addMessage(data) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${data.type}`;

    let content = '';

    switch (data.type) {
      case 'join':
        content = `<span class="system">${data.message}</span>`;
        break;

      case 'leave':
        content = `<span class="system">${data.message}</span>`;
        break;

      case 'chat':
        content = `<span class="username">${data.user}:</span> ${data.message}`;
        break;

      case 'system':
      case 'error':
        content = `<span class="system">${data.message}</span>`;
        break;

      default:
        content = data.message;
    }

    messageEl.innerHTML = content;
    messagesContainer.appendChild(messageEl);

    // Scroll to the bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}); 