// Firebase setup
const firebaseConfig = YOUR_FIREBASE_CONFIG; // Paste your config here
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Anonymous login
auth.signInAnonymously().then((user) => {
    const playerId = user.user.uid; // Unique player ID
    const playerName = prompt('Enter your penguin name:') || 'Anonymous'; // Simple name prompt

    // Game setup with Phaser
    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'game-container',
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    const game = new Phaser.Game(config);
    let playerSprite;
    let otherPlayers = {};
    let cursors;
    let background;

    function preload() {
        // Load background
        this.load.image('background', 'https://www.comicschau.de/wp-content/uploads/2025/12/agartha-meme-trend-tiktok-bedeutung.jpg');
        // Load penguin (use your provided URL or this similar one)
        this.load.image('penguin', 'https://www.clipartmax.com/png/middle/175-1751569_enter-image-description-here-club-penguin-purple-penguin.png');
    }

    function create() {
        // Add background (scaled to fit)
        background = this.add.image(400, 300, 'background').setDisplaySize(800, 600);

        // Player sprite
        playerSprite = this.add.image(400, 300, 'penguin').setScale(0.2); // Scale down to fit

        // Keyboard input
        cursors = this.input.keyboard.createCursorKeys();

        // Listen for other players' positions
        db.ref('players').on('value', (snapshot) => {
            const players = snapshot.val();
            for (let id in players) {
                if (id === playerId) continue;
                if (!otherPlayers[id]) {
                    otherPlayers[id] = this.add.image(players[id].x, players[id].y, 'penguin').setScale(0.2);
                } else {
                    otherPlayers[id].setPosition(players[id].x, players[id].y);
                }
            }
            // Remove disconnected players
            for (let id in otherPlayers) {
                if (!players[id]) {
                    otherPlayers[id].destroy();
                    delete otherPlayers[id];
                }
            }
        });

        // Chat setup
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        chatSend.addEventListener('click', sendChat);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

        function sendChat() {
            const msg = chatInput.value.trim();
            if (msg) {
                db.ref('chat').push({ name: playerName, message: msg });
                chatInput.value = '';
            }
        }

        // Listen for chat messages
        db.ref('chat').on('child_added', (snapshot) => {
            const msg = snapshot.val();
            const div = document.createElement('div');
            div.textContent = `${msg.name}: ${msg.message}`;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    function update() {
        const speed = 5;
        let moved = false;

        if (cursors.left.isDown) { playerSprite.x -= speed; moved = true; }
        if (cursors.right.isDown) { playerSprite.x += speed; moved = true; }
        if (cursors.up.isDown) { playerSprite.y -= speed; moved = true; }
        if (cursors.down.isDown) { playerSprite.y += speed; moved = true; }

        // Bound within canvas
        playerSprite.x = Phaser.Math.Clamp(playerSprite.x, 0, 800);
        playerSprite.y = Phaser.Math.Clamp(playerSprite.y, 0, 600);

        if (moved) {
            // Sync position to Firebase
            db.ref(`players/${playerId}`).set({ x: playerSprite.x, y: playerSprite.y });
        }
    }

    // Cleanup on disconnect
    db.ref(`players/${playerId}`).onDisconnect().remove();
}).catch((error) => console.error('Auth error:', error));
