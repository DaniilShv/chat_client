// Находим элементы интерфейса
const chatHeader = document.getElementById("chatHeader");
const messagesList = document.getElementById("messagesList");
const userInput = document.getElementById("userInput");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

// 1. Конфигурация соединения с SignalR Хабом
// Укажите URL, который вы настроили на бэкенде в MapHub<ChatHub>("/chat")
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5202/chat") 
    .withAutomaticReconnect([0, 2000, 5000, 10000]) // Попытки переподключения через 0, 2, 5 и 10 секунд
    .configureLogging(signalR.LogLevel.Information) // Логирование в консоль браузера для дебага
    .build();

// 2. РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ (Слушаем сервер)

// Слушаем метод "ReceiveMessage" (когда кто-то прислал сообщение в чат)
connection.on("ReceiveMessage", (user, message) => {
    appendMessage(user, message, "incoming");
});

// Дополнительно: можно слушать системные уведомления (например, о входе нового юзера)
connection.on("UserJoined", (username) => {
    appendSystemMessage(`${username} присоединился к чату`);
});


// 3. ОТПРАВКА СООБЩЕНИЙ НА СЕРВЕР

async function sendMessage() {
    const user = userInput.value.trim() || "Аноним";
    const message = messageInput.value.trim();

    if (!message) return; // Пустые сообщения не шлем

    try {
        // Вызываем метод хаба на бэкенде. Имя метода должно СТРОГО совпадать с C# кодом
        await connection.invoke("SendMessage", user, message);
        
        // Очищаем поле ввода и возвращаем фокус
        messageInput.value = "";
        messageInput.focus();
    } catch (err) {
        console.error("Ошибка отправки сообщения: ", err);
        appendSystemMessage("Не удалось отправить сообщение. Ошибка связи.");
    }
}

// Вешаем триггеры на кнопку и клавишу Enter
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
});


// 4. УПРАВЛЕНИЕ СОСТОЯНИЕМ СОЕДИНЕНИЯ

// Функция активации/деактивации полей ввода
function setChatAccessible(isAccessible) {
    messageInput.disabled = !isAccessible;
    sendButton.disabled = !isAccessible;
    if (isAccessible) {
        chatHeader.innerText = "Чат онлайн";
        chatHeader.style.background = "#0078d4";
    }
}

// Обработка жизненного цикла соединения
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


// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ UI

function appendMessage(user, message, type) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type);
    
    // Экранируем текст во избежание XSS-атак
    const strong = document.createElement("strong");
    strong.innerText = `${user}: `;
    const textSpan = document.createElement("span");
    textSpan.innerText = message;

    msgDiv.appendChild(strong);
    msgDiv.appendChild(textSpan);
    
    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight; // Скролл вниз к новому сообщению
}

function appendSystemMessage(text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "system");
    msgDiv.innerText = text;
    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
}


// 6. СТАРТ ПРИЛОЖЕНИЯ
async function start() {
    try {
        await connection.start();
        console.log("SignalR подключен успешно со специальным ID:", connection.connectionId);
        setChatAccessible(true);
    } catch (err) {
        console.error("Ошибка при старте SignalR:", err);
        chatHeader.innerText = "Ошибка подключения";
        chatHeader.style.background = "#d83b01";
        setTimeout(start, 5000); // Пробуем снова через 5 секунд, если бэкенд лежал при старте
    }
}

// Запускаем процесс
start();