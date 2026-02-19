const url = window.location.origin;

function showError(msg) {
    const e = document.getElementById("errorMessage");
    e.style.display = "block";
    e.innerText = msg;
}

function clearError() {
    const e = document.getElementById("errorMessage");
    e.style.display = "none";
    e.innerText = "";
}

async function createRoom() {
    clearError();

    const roomid = document.getElementById("room").value;
    const password = document.getElementById("password").value;

    if (!roomid || !password) {
        showError("Room ID and Password required");
        return;
    }

    const res = await fetch(url + "/signal/createroom/" + roomid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password)
    });

    const data = await res.text();

    if (data === "Created") {
        showUsernameStep(roomid, "caller");
    } else {
        showError(data);
    }
}

async function joinRoom() {
    clearError();

    const roomid = document.getElementById("room").value;
    const password = document.getElementById("password").value;

    if (!roomid || !password) {
        showError("Room ID and Password required");
        return;
    }

    const res = await fetch(url + "/signal/joinroom/" + roomid, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password)
    });

    const data = await res.text();

    if (data === "Joined") {
        showUsernameStep(roomid, "receiver");
    } else {
        showError(data);
    }
}

function showUsernameStep(roomid) {
    document.querySelectorAll(".btn").forEach(b => b.style.display = "none");
    document.getElementById("room").style.display = "none";
    document.getElementById("password").style.display = "none";

    document.getElementById("username").style.display = "block";
    document.getElementById("confirmBtn").style.display = "block";

    sessionStorage.setItem("tempRoomId", roomid);
}

function confirmUser() {
    const username = document.getElementById("username").value;

    if (!username) {
        showError("Username required");
        return;
    }

    sessionStorage.setItem("roomid", sessionStorage.getItem("tempRoomId"));
    sessionStorage.setItem("username", username);

    window.location.href = "room.html";
}
