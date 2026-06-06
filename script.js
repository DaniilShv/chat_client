const chatHeader = document.getElementById("chatHeader");
const messagesList = document.getElementById("messagesList");
const userInput = document.getElementById("userInput");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://mongrel-cost-disdain.ngrok-free.dev/chat") 
    .withAutomaticReconnect([0, 2000, 5000, 10000]) 
    .configureLogging(signalR.LogLevel.Information) 
    .build();

connection.on("ReceiveMessage", (user, message) => {
    appendMessage(user, message, "incoming");
});


connection.on("UserJoined", (username) => {
    appendSystemMessage(`${username} присоединился к чату`);
});

async function sendMessage() {
    const user = userInput.value.trim() || "Аноним";
    const message = messageInput.value.trim();

    if (!message) return; 

    try {
        await connection.invoke("SendMessage", user, message);
        
        messageInput.value = "";
        messageInput.focus();
    } catch (err) {
        console.error("Ошибка отправки сообщения: ", err);
        appendSystemMessage("Не удалось отправить сообщение. Ошибка связи.");
    }
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
});

function setChatAccessible(isAccessible) {
    messageInput.disabled = !isAccessible;
    sendButton.disabled = !isAccessible;
    if (isAccessible) {
        chatHeader.innerText = "Чат онлайн";
        chatHeader.style.background = "#0078d4";
    }
}

connection.onreconnecting((error) => {
    chatHeader.innerText = "Соединение потеряно. Переподключение...";
    chatHeader.style.background = "#ffaa00";
    setChatAccessible(false);
});

connection.onreconnected((connectionId) => {
    appendSystemMessage("Соединение восстановлено.");
    setChatAccessible(true);
});

connection.onclose((error) => {
    chatHeader.innerText = "Отключено";
    chatHeader.style.background = "#d83b01";
    setChatAccessible(false);
    appendSystemMessage("Связь с сервером окончательно потеряна. Перезагрузите страницу.");
});

function appendMessage(user, message, type) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type);
    
    const strong = document.createElement("strong");
    strong.innerText = `${user}: `;
    const textSpan = document.createElement("span");
    textSpan.innerText = message;

    msgDiv.appendChild(strong);
    msgDiv.appendChild(textSpan);
    
    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
}

function appendSystemMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "system");
    msgDiv.innerText = text;
    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
}

async function start() {
    try {
        await connection.start();
        console.log("SignalR подключен успешно со специальным ID:", connection.connectionId);
        setChatAccessible(true);
    } catch (err) {
        console.error("Ошибка при старте SignalR:", err);
        chatHeader.innerText = "Ошибка подключения";
        chatHeader.style.background = "#d83b01";
        setTimeout(start, 5000);
    }
}

start();
