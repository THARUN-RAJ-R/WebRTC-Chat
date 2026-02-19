
                        
const peerConnection = new RTCPeerConnection({
  iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "turn:free.expressturn.com:3478",
        username: "000000002086320510",
        credential: "VnTCNQxEeCj1DDIs5vCkH1Bc1dY=",
      }
  ],
});

const logBox = document.getElementById("log");
const chatBox = document.getElementById("chat");
const messageInput = document.getElementById("message");
const url = window.location.origin;

let dataChannel;
let isCaller = false;
let candidateInterval;
let currentRoomId = null;
let peer = "";
let me = "";


function log(message) {
    console.log("[WebRTC]", message);
    
}


peerConnection.onconnectionstatechange = () => {
    log("Connection State: " + peerConnection.connectionState);

    if (peerConnection.connectionState === "connected") {
        fetch(url + "/signal/cleanup/" + currentRoomId, { method: "POST" });
        clearInterval(candidateInterval);
    }
};


peerConnection.onicecandidate = async (event) => {

    if (!event.candidate) return;

    if (!currentRoomId) return;

    await fetch(url + "/signal/candidate/" + currentRoomId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            candidate: event.candidate,
            from: isCaller ? "caller" : "receiver"
        })
    });
};


function pollCandidates(Rid) {
    
    const target = isCaller ? "caller" : "receiver";

    candidateInterval = setInterval(async () => {
        
        if (peerConnection.connectionState === "connected") return;

        try {
            const res = await fetch(url + "/signal/candidate/" + target+"/"+Rid);
            const candidates = await res.json();

            for (let cand of candidates) {
                log("added ICE");
                await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            }
        } catch (err) {
            log("ICE fetch error: " + err);
        }

    }, 1000);
}


peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
};

let receivedChunks = [];
let receivedSize = 0;

function setupDataChannel() {

    dataChannel.onopen = () => {
        log("DataChannel OPEN");
    };
   
    let receivedChunks = [];
let receivedSize = 0;
let fileName = "";
let fileType = "";
let fileSize = 0;

dataChannel.onmessage = (e) => {

    if (typeof e.data === "string") {

        if (e.data.startsWith("TEXT:")) {

            const message = e.data.substring(5);

            addMessage(message, "peer");


            return;
        }


        if (e.data.startsWith("FILE_START:")) {

            const parts = e.data.split(":");

            fileName = parts[1];
            fileType = parts[2];
            fileSize = parts[3];

            receivedChunks = [];
            receivedSize = 0;
            
            log("Receiving file: " + fileName);

            return;
        }


        if (e.data === "FILE_END") {

    const fileBlob = new Blob(receivedChunks, { type: fileType });
    const fileUrl = URL.createObjectURL(fileBlob);

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "peer"); 

    if (fileType.startsWith("image/")) {

        const img = document.createElement("img");
        img.src = fileUrl;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";

        messageDiv.appendChild(img);
    }

    else if (fileType.startsWith("video/")) {

        const video = document.createElement("video");
        video.src = fileUrl;
        video.controls = true;
        video.style.maxWidth = "250px";
        video.style.borderRadius = "10px";

        messageDiv.appendChild(video);
    }

    
    else if (fileType.startsWith("audio/")) {

        const audio = document.createElement("audio");
        audio.src = fileUrl;
        audio.controls = true;

        messageDiv.appendChild(audio);
    }
    else if (fileType === "application/pdf") {

    const iframe = document.createElement("iframe");
    iframe.src = fileUrl;
    iframe.style.width = "250px";
    iframe.style.height = "300px";
    iframe.style.borderRadius = "10px";

    messageDiv.appendChild(iframe);
    }
    
    else {

        const fileLink = document.createElement("a");
        fileLink.href = fileUrl;
        fileLink.download = fileName;
        fileLink.textContent = " Download " + fileName;
        fileLink.style.color = "blue";

        messageDiv.appendChild(fileLink);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    receivedChunks = [];
    receivedSize = 0;

    return;
}


        return;
    }

    
    receivedChunks.push(e.data);

    receivedSize += e.data.byteLength;
    
};

}


async function createOffer(Rid) {

    isCaller = true;
    log("Becoming CALLER");

    dataChannel = peerConnection.createDataChannel(Rid);
    setupDataChannel();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await fetch(url + "/signal/offer/"+Rid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sdp: peerConnection.localDescription,
            username: me
        })
    });
    log("Offer sent");

    waitForAnswer(Rid);
    pollCandidates(Rid);
}

function waitForAnswer(Rid) {

    const interval = setInterval(async () => {

        try {
            const res = await fetch(url + "/signal/answer/"+Rid);
            const text = await res.text();
            if (text && text !== "" && text !== "{}") {
                const data = JSON.parse(text);
                const answerText = data.sdp;
                peer = data.username;
                await peerConnection.setRemoteDescription(JSON.parse(answerText));
                log("Answer accepted");

                clearInterval(interval);
            }
        } catch (err) {
            log("Answer error: " + err);
        }

    }, 1000);
}

async function createAnswer(offer,Rid) {

    isCaller = false;
    log("Becoming RECEIVER");

    await peerConnection.setRemoteDescription(JSON.parse(offer));
    log("Offer accepted");

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await fetch(url + "/signal/answer/"+Rid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sdp: peerConnection.localDescription,
            username: me
        })
    });

    log("Answer sent");

    pollCandidates(Rid);
}




function sendMessage() {

    if (dataChannel && dataChannel.readyState === "open") {
        
        if (messageInput.value !== "") {
            dataChannel.send(`TEXT:${messageInput.value}`);
            addMessage(messageInput.value, "me")
            messageInput.value = "";
        }
        
    } else {
        log("DataChannel not open");
    }
}
let file;
let view;
let totalsize;
let offset = 0;
let fileSendComplete = false;

const chunk_size = 262000;

const fileInput = document.getElementById("fileinput");

fileInput.addEventListener("change", async (event) => {

    file = event.target.files[0];

    if (!file) return;

    await sharefile();

    fileInput.value = "";
});


async function sharefile() {

    if (!dataChannel || dataChannel.readyState !== "open") {
        log("DataChannel not open");
        return;
    }
    displayMyFile(file);
    const buffer = await file.arrayBuffer();

    view = new Uint8Array(buffer);

    totalsize = view.length;

    offset = 0;

    fileSendComplete = false; 

    dataChannel.bufferedAmountLowThreshold = chunk_size + 100;

    dataChannel.onbufferedamountlow = sendNextChunk;

    dataChannel.send(`FILE_START:${file.name}:${file.type}:${file.size}`);

    sendNextChunk();
}


function displayMyFile(file) {

    const chatBox = document.getElementById("chat");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "me");

    const fileUrl = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {

        const img = document.createElement("img");
        img.src = fileUrl;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";

        messageDiv.appendChild(img);
    }

    else if (file.type.startsWith("video/")) {

        const video = document.createElement("video");
        video.src = fileUrl;
        video.controls = true;
        video.style.maxWidth = "250px";
        video.style.borderRadius = "10px";

        messageDiv.appendChild(video);
    }

    else if (file.type.startsWith("audio/")) {

        const audio = document.createElement("audio");
        audio.src = fileUrl;
        audio.controls = true;

        messageDiv.appendChild(audio);
    }
    
    else if (file.type === "application/pdf") {

    const iframe = document.createElement("iframe");
    iframe.src = fileUrl;
    iframe.style.width = "250px";
    iframe.style.height = "300px";
    iframe.style.borderRadius = "10px";

    messageDiv.appendChild(iframe);
    }
    else {

        const fileLink = document.createElement("a");
        fileLink.href = fileUrl;
        fileLink.download = file.name;
        fileLink.textContent = "Download :  " + file.name;

        messageDiv.appendChild(fileLink);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendNextChunk() {

    if (fileSendComplete) return;

    while (
        offset < totalsize &&
        dataChannel.bufferedAmount < dataChannel.bufferedAmountLowThreshold
    ) {

        let end = Math.min(offset + chunk_size, totalsize);

        let chunk = view.slice(offset, end);

        dataChannel.send(chunk);

        offset = end;
    }

    if (offset >= totalsize && !fileSendComplete) {

        fileSendComplete = true;

        dataChannel.send("FILE_END");

        log("File transfer complete");
        dataChannel.onbufferedamountlow = null;
    }
}



window.onload = async function() {

    const roomid = sessionStorage.getItem("roomid");
    const username = sessionStorage.getItem("username");

    me = username;
    currentRoomId = roomid;

    if (!roomid) {
        window.location.href = "index.html";
        return;
    }

    try {

        const response = await fetch(url + "/signal/offer/" + roomid);
        const text = await response.text();
        
        if (!text || text === "{}") {
            //log(text);
            await createOffer(roomid);
            return;
        }  else {
            const data = JSON.parse(text);
            peer = data.username;
            await createAnswer(data.sdp, roomid);
        }

    } catch (err) {
        console.error("Signaling error:", err);
    }
};




function addMessage(text, type) {

    const chatBox = document.getElementById("chat");

    const msg = document.createElement("div");
    msg.classList.add("message", type);

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("username");

    if (type === "me") {
        nameDiv.textContent = me;    
    } else {
        nameDiv.textContent = peer;
    }

    const content = document.createElement("div");
    content.textContent = text;

    const time = document.createElement("div");
    time.classList.add("timestamp");
    time.textContent = new Date().toLocaleTimeString();

    msg.appendChild(nameDiv);
    msg.appendChild(content);
    msg.appendChild(time);

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}




