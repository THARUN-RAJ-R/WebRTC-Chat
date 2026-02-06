
const peerConnection = new RTCPeerConnection({
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
});

const url = "deployment url"
const chatBox = document.getElementById("chat");
const messageInput = document.getElementById("message");


let dataChannel ;


peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;

    dataChannel.onmessage = (e) => {
        chatBox.textContent += "Peer: " + e.data + "\n";
    };

    dataChannel.onopen = () => {
        chatBox.textContent += "DataChannel opened\n";
    };
};

async function SendOffer() {
        dataChannel = peerConnection.createDataChannel("chat");
        dataChannel.onopen = () => {
            chatBox.textContent += "DataChannel opened\n";
        };

        dataChannel.onmessage = (event) => {
            chatBox.textContent += "Peer: " + event.data + "\n";
        };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await fetch(url+"/signal/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peerConnection.localDescription)
    });

    alert("Sent Offer");
}





async function CheckOffer() {
    
        const res = await fetch(url+"/signal/offer");
        const offer = await res.text();

        if (offer) {
            await peerConnection.setRemoteDescription(JSON.parse(offer));
            alert("Offer Accepted ");
        }
        else{
            alert("Not Received");
        }
}

async function SendAnswer() {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await fetch(url+"/signal/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peerConnection.localDescription)
    });

    alert("Send Answer");
}

async function CheckAnswer() {
        const res = await fetch(url+"/signal/answer");
        const answer = await res.text();

        if (answer) {
            await peerConnection.setRemoteDescription(JSON.parse(answer));
            alert("Answer Accepted ");
        }
        else{
            alert("Not Received");
        }
}


function sendMessage() {
    const message = messageInput.value;
    dataChannel.send(message);
    chatBox.textContent += "Me: " + message + "\n";
    messageInput.value = "";
}