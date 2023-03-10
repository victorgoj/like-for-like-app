var socket = io() 
const newVideoButton = document.getElementById("newVideoButton")

socket.on("loadvideo", url => {
    console.log("CLIENT: ", url)
})

newVideoButton.addEventListener("click", (e) => {
    e.preventDefault();

    var xhr = new XMLHttpRequest();
        xhr.open("GET", "/loadvideo", true);
        // xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        // console.log(JSON.stringify(temp));
        xhr.send();

})



