const postButton = document.getElementById("submitButton");
var socket = io()
const loadButton = document.getElementById("loadButton")
const uName = document.getElementById("usernameSpan").innerHTML;
socket.on("connect", () => {
    console.log("[CLIENT]: ID: ", socket.id);
    socket.emit("update_socket", uName);
    // console.log(socket.id); // x8WIv7-mJelg7on_ALbx
  });

  socket.on("disconnect", () => {
    console.log("[CLIENT]: disconnected");
  })

  socket.on("socket_test", (username) => {
    console.log("Socket test worked for ", username);
  })

socket.on("error", () => {
    const fehler = document.createElement("h1");
    fehler.innerHTML = "Video couldnt be posted / No videos could be loaded."
    fehler.style.color = "red";
    document.body.appendChild(fehler);
})



socket.on("loadvideo", (url) => {
    // console.log("(CLIENT) VIDEO: ", url)

    console.log("Video URL received ", url)
    
        for(let i = 0; i < Math.min(url.length, 5); i++) {
            console.log(url[i]);
            const newVid = document.createElement("div");
            const vidUrl = document.createElement("a");
            // vidUrl.setAttribute("innerHTML", url[i].url);
            vidUrl.innerText = url[i].url;
            vidUrl.href = `https://www.youtube.com/watch?v=${url[i].url}`;
            const likeButton = document.createElement("button");
            likeButton.textContent = `Like and earn ${url[i].points} points!`
            likeButton.onclick = function() {
                likeButtonOnClickEvent(url[i].url, url[i].user, url[i].points);
            }
            newVid.appendChild(likeButton);
            newVid.appendChild(vidUrl);
            document.body.appendChild(newVid);
        }
    // }

})

const likeButtonOnClickEvent = (url, uploader, pointsP) => {
    
    socket.emit("likeVideoEvent", ({"url": url, "username": document.getElementById("usernameSpan").innerHTML, "uploader": uploader, "points": pointsP}));
}

socket.on("success", () => {
    const fehler = document.createElement("h1");
    fehler.innerHTML = "Video posted successfully :)"
    fehler.style.color = "green";
    document.body.appendChild(fehler);
})

loadButton.addEventListener("click", (e) => {
    e.preventDefault();
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/loadvideo", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send(`username=${document.getElementById("usernameSpan").innerHTML}`);
})

postButton.addEventListener("click", (e) => {
    const pointsL = document.getElementById("pointsBox").value;
    e.preventDefault();
    if (pointsL <= 0 || !enoughPoints(pointsL)) {
        // e.preventDefault();
        const fehler = document.createElement("h1");
        fehler.innerHTML = "Enter valid points"
        fehler.style.color = "red";
        document.body.appendChild(fehler);
        return;
    }

    else {
        const videoUrlTextBox = document.getElementById("videoUrlTextBox");
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/post", true);
        // xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        // console.log(JSON.stringify(temp));
        xhr.send(`videoUrl=${videoUrlTextBox.value}&username=${document.getElementById("usernameSpan").innerHTML}&points=${document.getElementById("pointsBox").value}`);
    }
})

const enoughPoints = (points) => {
    const userPoints = parseInt(document.getElementById("anzPoints").innerHTML);
    // console.log("comparing ", points, " and ", userPoints)
    if (points <= userPoints) {
        return true;
    }

    else { return false; }
}
