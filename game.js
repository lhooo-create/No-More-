// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCDdpTizZEN6MUnsealEnWEstCu168OYw0",
    authDomain: "no-to-losers.firebaseapp.com",
    databaseURL: "https://no-to-losers-default-rtdb.firebaseio.com",
    projectId: "no-to-losers",
    storageBucket: "no-to-losers.firebasestorage.app",
    messagingSenderId: "614042942914",
    appId: "1:614042942914:web:362ea7549b3a2b2e8dea5b",
    measurementId: "G-XX6N16BQLD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// متغيرات اللعبة
let playerId;
let playerName;
let currentRoomId;
let players = {};
let keys = {};
let obstacles = [];
let gameState = {
    keysCollected: 0,
    totalKeys: 3,
    gameStarted: false
};
const ropeLength = 200; // طول الحبل بين اللاعبين

// عناصر DOM
const gameContainer = document.getElementById('gameContainer');
const playerForm = document.getElementById('playerForm');
const roomIdInput = document.getElementById('roomId');
const playerNameInput = document.getElementById('playerName');
const joinRoomBtn = document.getElementById('joinRoom');
const gameInfo = document.getElementById('gameInfo');
const keysInfo = document.getElementById('keysInfo');
const roomInfo = document.getElementById('roomInfo');
const playersCount = document.getElementById('playersCount');
const keysCollected = document.getElementById('keysCollected');
const keyHolders = document.getElementById('keyHolders');

// صور اللاعبين
const playerImages = [
    'player_1.png',
    'player_2.png',
    'player_3.png',
    'player_4.png',
    'player_5.png',
    'player_6.png',
    'player_7.png',
    'player_8.png',
    'player_9.png'
];

// عند تحميل الصفحة
window.onload = function() {
    // إنشاء العقبات
    createObstacles();
    
    // إنشاء المفاتيح
    createKeys();
    
    // إنشاء الباب
    createDoor();
    
    // التحقق من وجود معرف غرفة في URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    
    if (urlRoomId) {
        roomIdInput.value = urlRoomId;
    }
    
    // حدث الانضمام للعبة
    joinRoomBtn.addEventListener('click', joinGame);
    playerNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinGame();
        }
    });
};

// انضمام لاعب جديد
function joinGame() {
    currentRoomId = roomIdInput.value.trim();
    playerName = playerNameInput.value.trim();
    
    if (playerName === '') {
        alert('الرجاء إدخال اسم اللاعب');
        return;
    }
    
    playerId = generatePlayerId();
    
    if (currentRoomId === '') {
        createNewRoom();
    } else {
        joinExistingRoom();
    }
}

// إنشاء غرفة جديدة
function createNewRoom() {
    currentRoomId = generateRoomId();
    
    database.ref('rooms/' + currentRoomId).set({
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        status: 'waiting',
        players: {},
        keys: {},
        gameState: {
            keysCollected: 0,
            totalKeys: 3,
            gameStarted: false
        }
    }).then(() => {
        joinExistingRoom();
        
        // تحديث URL ليشمل معرف الغرفة
        window.history.pushState({}, '', `?room=${currentRoomId}`);
    });
}

// الانضمام إلى غرفة موجودة
function joinExistingRoom() {
    playerForm.style.display = 'none';
    gameInfo.style.display = 'block';
    keysInfo.style.display = 'block';
    roomInfo.style.display = 'block';
    
    // إضافة اللاعب إلى قاعدة البيانات
    const playerRef = database.ref('rooms/' + currentRoomId + '/players/' + playerId);
    const randomPlayerImage = playerImages[Math.floor(Math.random() * playerImages.length)];
    
    playerRef.set({
        name: playerName,
        x: Math.floor(Math.random() * (window.innerWidth - 100)),
        y: Math.floor(Math.random() * (window.innerHeight - 100)),
        hasKey: false,
        playerImg: randomPlayerImage
    });
    
    // بدء الاستماع لأحداث لوحة المفاتيح
    document.addEventListener('keydown', handleKeyDown);
    
    // الاستماع لتغييرات اللاعبين
    database.ref('rooms/' + currentRoomId + '/players').on('value', (snapshot) => {
        players = snapshot.val() || {};
        updatePlayersCount();
        renderPlayers();
    });
    
    // الاستماع لتغييرات المفاتيح
    database.ref('rooms/' + currentRoomId + '/keys').on('value', (snapshot) => {
        keys = snapshot.val() || {};
        renderKeys();
    });
    
    // الاستماع لحالة اللعبة
    database.ref('rooms/' + currentRoomId + '/gameState').on('value', (snapshot) => {
        gameState = snapshot.val() || { keysCollected: 0, totalKeys: 3, gameStarted: false };
        updateGameInfo();
    });
    
    // تحديث معلومات الغرفة
    database.ref('rooms/' + currentRoomId).on('value', (snapshot) => {
        const roomData = snapshot.val();
        if (roomData) {
            roomInfo.textContent = `غرفة: ${currentRoomId} | اللاعبون: ${Object.keys(roomData.players || {}).length}`;
        }
    });
}

// توليد معرف فريد للاعب
function generatePlayerId() {
    return 'player-' + Math.random().toString(36).substr(2, 9);
}

// توليد معرف غرفة
function generateRoomId() {
    return 'room-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// معالجة حركة اللاعب
function handleKeyDown(e) {
    const playerRef = database.ref('rooms/' + currentRoomId + '/players/' + playerId);
    const speed = 8;
    let newX = players[playerId].x;
    let newY = players[playerId].y;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
            newY -= speed;
            break;
        case 'ArrowDown':
        case 's':
            newY += speed;
            break;
        case 'ArrowLeft':
        case 'a':
            newX -= speed;
            break;
        case 'ArrowRight':
        case 'd':
            newX += speed;
            break;
    }
    
    // التحقق من حدود الشاشة
    newX = Math.max(0, Math.min(window.innerWidth - 50, newX));
    newY = Math.max(0, Math.min(window.innerHeight - 50, newY));
    
    // التحقق من التصادم مع العقبات
    if (checkObstacleCollision(newX, newY, 50, 50)) {
        return;
    }
    
    // التحقق من قيود الحبل
    const ropeCheck = checkRopeConstraints(newX, newY);
    if (!ropeCheck.valid) {
        newX = ropeCheck.x;
        newY = ropeCheck.y;
        
        if (ropeCheck.tooFar) {
            // إظهار رسالة تنبيه إذا كان الحبل مشدودًا جدًا
            const warningElement = document.getElementById('rope-warning');
            if (!warningElement) {
                const warning = document.createElement('div');
                warning.id = 'rope-warning';
                warning.textContent = 'الحبل مشدود جدًا!';
                warning.style.position = 'absolute';
                warning.style.top = '50%';
                warning.style.left = '50%';
                warning.style.transform = 'translate(-50%, -50%)';
                warning.style.backgroundColor = 'rgba(0,0,0,0.7)';
                warning.style.color = 'white';
                warning.style.padding = '10px';
                warning.style.borderRadius = '5px';
                warning.style.zIndex = '100';
                gameContainer.appendChild(warning);
                
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.parentNode.removeChild(warning);
                    }
                }, 1000);
            }
        }
    }
    
    // تحديث موقع اللاعب
    playerRef.update({
        x: newX,
        y: newY
    });
    
    // التحقق من جمع المفاتيح
    checkKeyCollection(newX, newY);
}

// التحقق من التصادم مع العقبات
function checkObstacleCollision(x, y, width, height) {
    for (const obstacle of obstacles) {
        if (x < obstacle.x + obstacle.width &&
            x + width > obstacle.x &&
            y < obstacle.y + obstacle.height &&
            y + height > obstacle.y) {
            return true;
        }
    }
    return false;
}

// إنشاء العقبات
function createObstacles() {
    obstacles = [
        { x: 200, y: 150, width: 100, height: 20 },
        { x: 400, y: 300, width: 20, height: 150 },
        { x: 100, y: 400, width: 150, height: 20 },
        { x: 500, y: 100, width: 20, height: 200 },
        { x: 300, y: 500, width: 200, height: 20 }
    ];
    
    obstacles.forEach((obstacle, index) => {
        const obstacleElement = document.createElement('div');
        obstacleElement.className = 'obstacle';
        obstacleElement.style.left = obstacle.x + 'px';
        obstacleElement.style.top = obstacle.y + 'px';
        obstacleElement.style.width = obstacle.width + 'px';
        obstacleElement.style.height = obstacle.height + 'px';
        gameContainer.appendChild(obstacleElement);
    });
}

// إنشاء المفاتيح
function createKeys() {
    const keyPositions = [
        { x: 100, y: 100 },
        { x: 300, y: 400 },
        { x: 600, y: 200 }
    ];
    
    keyPositions.forEach((pos, index) => {
        database.ref('rooms/' + currentRoomId + '/keys/key' + index).set({
            x: pos.x,
            y: pos.y,
            collected: false
        });
    });
}

// عرض المفاتيح
function renderKeys() {
    // إزالة المفاتيح الحالية
    document.querySelectorAll('.key').forEach(el => el.remove());
    
    // عرض المفاتيح غير المجمعة
    for (const keyId in keys) {
        if (keys[keyId] && !keys[keyId].collected) {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.id = keyId;
            keyElement.style.left = keys[keyId].x + 'px';
            keyElement.style.top = keys[keyId].y + 'px';
            gameContainer.appendChild(keyElement);
        }
    }
}

// إنشاء الباب
function createDoor() {
    const doorElement = document.createElement('div');
    doorElement.className = 'door';
    gameContainer.appendChild(doorElement);
}

// التحقق من جمع المفاتيح
function checkKeyCollection(playerX, playerY) {
    if (players[playerId].hasKey) return;
    
    for (const keyId in keys) {
        const key = keys[keyId];
        if (key && !key.collected) {
            const distance = Math.sqrt(
                Math.pow(playerX - key.x, 2) + 
                Math.pow(playerY - key.y, 2)
            );
            
            if (distance < 40) { // مسافة الجمع
                collectKey(keyId);
            }
        }
    }
}

// جمع المفتاح
function collectKey(keyId) {
    // تحديث حالة المفتاح
    database.ref('rooms/' + currentRoomId + '/keys/' + keyId).update({
        collected: true
    });
    
    // تحديث حالة اللاعب
    database.ref('rooms/' + currentRoomId + '/players/' + playerId).update({
        hasKey: true
    });
    
    // تحديث حالة اللعبة
    const newKeysCollected = gameState.keysCollected + 1;
    database.ref('rooms/' + currentRoomId + '/gameState').update({
        keysCollected: newKeysCollected
    });
    
    // التحقق من فتح الباب
    if (newKeysCollected >= gameState.totalKeys) {
        unlockDoor();
    }
}

// فتح الباب
function unlockDoor() {
    const doorElement = document.querySelector('.door');
    doorElement.style.backgroundImage = "url('https://cdn-icons-png.flaticon.com/512/1100/1100263.png')";
    
    // إظهار رسالة الفوز
    const winMessage = document.createElement('div');
    winMessage.textContent = 'تهانينا! لقد جمعتم جميع المفاتيح!';
    winMessage.style.position = 'absolute';
    winMessage.style.top = '50%';
    winMessage.style.left = '50%';
    winMessage.style.transform = 'translate(-50%, -50%)';
    winMessage.style.backgroundColor = 'rgba(0,0,0,0.8)';
    winMessage.style.color = 'gold';
    winMessage.style.padding = '20px';
    winMessage.style.borderRadius = '10px';
    winMessage.style.fontSize = '24px';
    winMessage.style.zIndex = '100';
    winMessage.style.textAlign = 'center';
    gameContainer.appendChild(winMessage);
}

// التحقق من قيود الحبل
function checkRopeConstraints(newX, newY) {
    let result = { valid: true, x: newX, y: newY, tooFar: false };
    
    for (const otherPlayerId in players) {
        if (otherPlayerId !== playerId && players[otherPlayerId]) {
            const otherPlayer = players[otherPlayerId];
            const distance = Math.sqrt(
                Math.pow(newX - otherPlayer.x, 2) + 
                Math.pow(newY - otherPlayer.y, 2)
            );
            
            if (distance > ropeLength) {
                result.valid = false;
                result.tooFar = true;
                
                // حساب موقع جديد ضمن نطاق الحبل
                const angle = Math.atan2(otherPlayer.y - newY, otherPlayer.x - newX);
                result.x = otherPlayer.x - Math.cos(angle) * ropeLength * 0.9;
                result.y = otherPlayer.y - Math.sin(angle) * ropeLength * 0.9;
            }
        }
    }
    
    return result;
}

// عرض اللاعبين
function renderPlayers() {
    // إزالة اللاعبين والحبال الحالية
    document.querySelectorAll('.player, .rope').forEach(el => el.remove());
    
    // عرض جميع اللاعبين
    for (const id in players) {
        if (players[id]) {
            const player = players[id];
            const playerElement = document.createElement('div');
            playerElement.className = 'player';
            playerElement.id = id;
            playerElement.style.left = player.x + 'px';
            playerElement.style.top = player.y + 'px';
            
            // استخدام الصور المقدمة للاعبين
            if (player.playerImg) {
                playerElement.style.backgroundImage = `url('${player.playerImg}')`;
            }
            
            // إضافة اسم اللاعب
            const nameElement = document.createElement('div');
            nameElement.className = 'player-name';
            nameElement.textContent = player.name;
            playerElement.appendChild(nameElement);
            
            // إضافة أيقونة المفتاح إذا كان اللاعب يحمل مفتاحًا
            if (player.hasKey) {
                const keyIcon = document.createElement('div');
                keyIcon.className = 'key-icon';
                keyIcon.style.position = 'absolute';
                keyIcon.style.top = '-10px';
                keyIcon.style.left = '15px';
                playerElement.appendChild(keyIcon);
            }
            
            gameContainer.appendChild(playerElement);
        }
    }
    
    // رسم الحبال بين اللاعبين
    const playerIds = Object.keys(players);
    for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
            const player1 = players[playerIds[i]];
            const player2 = players[playerIds[j]];
            
            if (player1 && player2) {
                drawRope(
                    player1.x + 25, 
                    player1.y + 25, 
                    player2.x + 25, 
                    player2.y + 25
                );
            }
        }
    }
}

// رسم الحبل بين لاعبين
function drawRope(x1, y1, x2, y2) {
    const rope = document.createElement('div');
    rope.className = 'rope';
    
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    rope.style.width = `${length}px`;
    rope.style.left = `${x1}px`;
    rope.style.top = `${y1}px`;
    rope.style.transform = `rotate(${angle}rad)`;
    
    // تغيير لون الحبل حسب الشد
    const maxLength = ropeLength;
    const tension = Math.min(1, length / maxLength);
    const red = 139 + Math.floor(116 * tension);
    const green = 69 - Math.floor(69 * tension);
    const blue = 19 - Math.floor(19 * tension);
    rope.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
    
    gameContainer.appendChild(rope);
}

// تحديث عدد اللاعبين
function updatePlayersCount() {
    playersCount.textContent = `اللاعبون: ${Object.keys(players).length}`;
}

// تحديث معلومات اللعبة
function updateGameInfo() {
    keysCollected.textContent = `المفاتيح المجمعة: ${gameState.keysCollected}/${gameState.totalKeys}`;
    
    // تحديث حاملي المفاتيح
    keyHolders.innerHTML = '';
    for (const id in players) {
        if (players[id] && players[id].hasKey) {
            const holder = document.createElement('div');
            holder.textContent = players[id].name;
            keyHolders.appendChild(holder);
        }
    }
}
