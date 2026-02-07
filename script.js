import { apiKey } from "./config.js";
console.log("JS loaded");

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const imageInput = document.getElementById("image-input");
const avatar = document.getElementById("avatar");
const previewImg = document.getElementById("preview-img");
const removeImageBtn = document.getElementById("remove-image");
const previewBox = document.getElementById("file-preview");
const fileName = document.getElementById("file-name");
const fileSize = document.getElementById("file-size");
const fileIcon = document.getElementById("file-icon");
const removeFileBtn = document.getElementById("remove-file");
const chatList = document.getElementById("chat-list");
const newChatBtn = document.getElementById("new-chat");
console.log("New chat button:", newChatBtn);
let chats = JSON.parse(localStorage.getItem("chats")) || {};
let currentChatId = localStorage.getItem("currentChatId");

let selectedFile = null;


const micButton = document.getElementById("mic-button");

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let listening = false;

if(SpeechRecognition){
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
}

let selectedImage = null;

window.onload = () => {
    chats = JSON.parse(localStorage.getItem("chats")) || {};

    if(Object.keys(chats).length === 0){
        createNewChat();
    } else {
        currentChatId = localStorage.getItem("currentChatId") || Object.keys(chats)[0];
        loadChat(currentChatId);
    }

    renderChatList();
};


imageInput.addEventListener("change", e => {
    selectedFile = e.target.files[0];
    if(!selectedFile) return;

    fileName.textContent = selectedFile.name;
    fileSize.textContent = (selectedFile.size / 1024).toFixed(1) + " KB";

    if(selectedFile.type.startsWith("image/")){
        fileIcon.textContent = "🖼️";
    } else if(selectedFile.type === "application/pdf"){
        fileIcon.textContent = "📄";
    } else {
        fileIcon.textContent = "📝";
    }

    previewBox.classList.remove("hidden");
});

removeFileBtn.onclick = () => {
    selectedFile = null;
    imageInput.value = "";
    previewBox.classList.add("hidden");
};



function typeMessage(text){
    return new Promise(resolve => {
        const row = document.createElement("div");
        row.className = "message-row bot";

        const avatarImg = document.createElement("img");
        avatarImg.className = "avatar";
        avatarImg.src = "https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg";

        const bubble = document.createElement("div");
        bubble.className = "message bot-message";

        row.appendChild(avatarImg);
        row.appendChild(bubble);
        chatBox.appendChild(row);

        let i = 0;
        const interval = setInterval(() => {
            bubble.textContent += text.charAt(i);
            i++;
            chatBox.scrollTop = chatBox.scrollHeight;

            if(i === text.length){
                clearInterval(interval);

                const time = document.createElement("div");
                time.className = "timestamp";
                time.textContent = getTime();
                bubble.appendChild(time);

                resolve();
            }
        }, 20); // typing speed
    });
}
function getTime(){
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* Add message */
function addMessage(content, sender){
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    const avatarImg = document.createElement("img");
    avatarImg.className = "avatar";
    avatarImg.src =
        sender === "user"
        ? "https://cdn-icons-png.flaticon.com/512/9385/9385289.png"
        : "https://img.freepik.com/free-vector/chatbot-chat-message-vectorart_78370-4104.jpg?semt=ais_hybrid&w=740&q=80";

    const bubble = document.createElement("div");
    bubble.className = `message ${sender}-message`;

    if(content instanceof HTMLElement){
        bubble.appendChild(content);
    } else {
        bubble.textContent = content;
    }

    const time = document.createElement("div");
    time.className = "timestamp";
    time.textContent = getTime();

    bubble.appendChild(time);

    if(sender === "user"){
        row.appendChild(bubble);
        row.appendChild(avatarImg);
    } else {
        row.appendChild(avatarImg);
        row.appendChild(bubble);
    }

    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
}
/* Typing */
function showTyping(){
    avatar.classList.add("talking");
    const div = document.createElement("div");
    div.className="message bot-message";
    div.textContent="MQchatbot is typing...";
    chatBox.appendChild(div);
    return div;
}

/* Convert image to base64 */
function toBase64(file){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result.split(",")[1]);
        reader.onerror=reject;
        reader.readAsDataURL(file);
    });
}

/* Call Gemini */
async function getBotReply(text,image){

    const parts=[];

    if(text) parts.push({text});

    if(image){
        const base64=await toBase64(image);
        parts.push({
            inline_data:{
                mime_type:image.type,
                data:base64
            }
        });
    }

    const res=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({contents:[{parts}]})
    });

    const data=await res.json();

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

/* Send */
sendButton.onclick = async ()=>{

    if(!userInput.value && !selectedFile) return;

   if(userInput.value){
    addMessage(userInput.value, "user");
    autoTitleChat(userInput.value); 
}


   if(selectedFile){
    if(selectedFile.type.startsWith("image/")){
        const img = document.createElement("img");
        img.src = URL.createObjectURL(selectedFile);
        addMessage(img, "user");
    } else {
        const div = document.createElement("div");
        div.textContent = "📎 " + selectedFile.name;
        addMessage(div, "user");
    }
}


    const typing=showTyping();

    const reply=await getBotReply(userInput.value,selectedFile);

    typing.remove();
    avatar.classList.remove("talking");

    addMessage(reply,"bot");

    userInput.value="";
    previewBox.classList.add("hidden");
    selectedFile=null;
    imageInput.value = "";
    chats[currentChatId] = chatBox.innerHTML;

    localStorage.setItem("chatHistory",chatBox.innerHTML);
    saveCurrentChat();

};


/* Enter key */
userInput.addEventListener("keypress",e=>{
    if(e.key==="Enter") sendButton.click();
});

const clearBtn = document.getElementById("clear-chat");

clearBtn.onclick = () => {
    if(confirm("Clear chat history?")){
        chatBox.innerHTML = "";
        localStorage.removeItem("chatHistory");
    }
};

if(recognition){
    micButton.onclick = () => {
        if(!listening){
            recognition.start();
            listening = true;
            micButton.classList.add("listening");
            micButton.textContent = "🛑";
        } else {
            recognition.stop();
        }
    };

    recognition.onresult = (event) => {
        sendButton.click();
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
    };

    recognition.onend = () => {
        listening = false;
        micButton.classList.remove("listening");
        micButton.textContent = "🎤";
    };

    recognition.onerror = () => {
        listening = false;
        micButton.classList.remove("listening");
        micButton.textContent = "🎤";
        alert("Voice recognition error.");
    };
} else {
    micButton.disabled = true;
    micButton.title = "Voice input not supported in this browser";
}

chats = {
  chatId1: "<html of messages>",
  chatId2: "<html of messages>"
}

currentChatId = "chatId1"


newChatBtn.onclick = createNewChat;

function createNewChat(){
    if(currentChatId && chats[currentChatId]){
        chats[currentChatId].messages = chatBox.innerHTML;
    }

    const id = "chat-" + Date.now();
    chats[id] = {
        title: "New Chat",
        messages: ""
    };

    currentChatId = id;
    chatBox.innerHTML = "";

    localStorage.setItem("chats", JSON.stringify(chats));
    localStorage.setItem("currentChatId", id);

    renderChatList();
}


function loadChat(id){
    if(currentChatId && chats[currentChatId]){
        chats[currentChatId].messages = chatBox.innerHTML;
    }

    currentChatId = id;
    chatBox.innerHTML = chats[id]?.messages || "";

    localStorage.setItem("currentChatId", id);
    renderChatList();
}



function saveChats(){
    localStorage.setItem("chats", JSON.stringify(chats));
}

function renderChatList(){
    chatList.innerHTML = "";

    Object.keys(chats).reverse().forEach(id => {
        const item = document.createElement("div");
        item.className = "chat-item" + (id === currentChatId ? " active" : "");
        item.onclick = () => loadChat(id);

        const title = document.createElement("span");
        title.textContent = chats[id].title || "New Chat";

        const del = document.createElement("button");
        del.textContent = "🗑️";
        del.style.border = "none";
        del.style.background = "transparent";
        del.style.cursor = "pointer";

        del.onclick = (e) => {
            e.stopPropagation();
            if(!confirm("Delete this chat?")) return;

            delete chats[id];

            const keys = Object.keys(chats);
            if(id === currentChatId){
                if(keys.length){
                    loadChat(keys[0]);
                } else {
                    createNewChat();
                }
            }

            localStorage.setItem("chats", JSON.stringify(chats));
            renderChatList();
        };

        item.appendChild(title);
        item.appendChild(del);
        chatList.appendChild(item);
    });
}




function autoTitleChat(text){
    if(!currentChatId) return;

    const chat = chats[currentChatId];
    if(!chat || chat.title !== "New Chat") return;

    // Clean + shorten title
    const title = text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);

    chat.title = title || "New Chat";

    localStorage.setItem("chats", JSON.stringify(chats));
    renderChatList();
}
