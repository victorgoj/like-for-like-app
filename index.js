const express = require('express')
const app = express()
const port = 3000
const User = require("./models/user");
const Video = require("./models/video")
const bcrypt = require("bcrypt");
const session = require("express-session");
const axios = require("axios");
const apiKey = "" //Youtube V3 API Key notwendig
const creds = require("./credentials.json");
const { google } = require("googleapis");
const { oauth2 } = require("googleapis/build/src/apis/oauth2");

var oauth2Client = new google.auth.OAuth2(
    creds.web.client_id,
    creds.web.client_secret,
    creds.web.redirect_uris[0]
);

google.options({ auth: oauth2Client });

var logged = false;

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const mongoose = require('mongoose');
mongoose.connect(''); //MongoDB Verbindung notwendig

app.use("/public", express.static("public")) //für lokale JS Dateien

const requireLogin = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect("/login");
    }
    next();
}

const loggedIn = (req, res, next) => {
    if (req.session.user_id) {
        return res.redirect("/");
    }
    next();
}

app.use(express.urlencoded({ extended: true }))
app.use(session({ secret: "notagoodsecret" }))

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        res.send("Invalid username or password!")
        return;
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (validPassword) {
        req.session.user_id = user.id;
        req.session.username = username;
        res.redirect("/");
    }
    else {
        res.send("Invalid username or password!")
    }
})


app.get("/", requireLogin, async (req, res) => {

    if (!logged) {
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: "https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/userinfo.profile",
        });
        res.render("googlelogin.ejs", { authorizeUrl })
    }

    else {
        var oauth2 = google.oauth2({
            version: "v2"
        })
        var name = "";
        const userInfos = await oauth2.userinfo.get();
        name = userInfos.data.name;
        const user = await User.findOne({ username: req.session.username });
        const username = user.username;
        const points = user.points;
        let videosArray = [];
        for await (const vid of Video.find()) {
            videosArray.push(vid);
        }
        res.render("homepage.ejs", { username, points, videosArray, name })
    }
})

app.get("/register", loggedIn, (req, res) => {
    res.render("register.ejs");
})

app.get("/login", loggedIn, (req, res) => {
    res.render("login.ejs");
})

app.post("/dev", async (req, res) => {
    const user = await User.findOne({ username: "a" });
    req.session.user_id = user.id;
    req.session.username = "a";
    res.redirect("/");
})

app.get("/google/callback", async (req, res) => {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens);
    logged = true;
    res.redirect("/")
})

let usernames = [];

io.on("connection", (socket) => {
    console.log("[Server]: connection established with socket id: ", socket.id)

    socket.on("update_socket", (username1) => {
        if(!usernames.filter(e => e.username === username1).length > 0) {
            usernames.push({username: username1, socket: socket.id})
        }  
        else {
            usernames[usernames.findIndex(e => e.username === username1)].socket = socket.id;
        }
    })

    socket.on("disconnect", () => {
        console.log("user disconnected")
    })

    socket.on("likeVideoEvent", async (data) => {
        
        var youtube = google.youtube({
            version: "v3"
        })

        await youtube.videos.rate({
            "id": data.url,
            "rating": "like"
        })

        const liker = await User.findOne({"username" : data.username}) 
        const uploader = await User.findOne({"username" : data.uploader}) 

        liker.points += data.points;
        uploader.points -= data.points;
        await liker.save();
        await uploader.save();
        await Video.find({"user": data.uploader, "points": {$gt: uploader.points}}).remove();
       

    })

    app.post("/loadvideo", async (req, res) => {

        const u1 = req.body.username;
        const videos = await Video.find({ "user": { $ne: u1 } });
        if (videos) {
            var youtube = google.youtube({
                version: "v3"
            })

            const tmpVideos = [];

                for(let i = 0; i < videos.length; i++) {
                await youtube.videos.getRating({
                    "id": [
                        `${videos[i].url}`
                    ]
                }).then(res => {
                    if (!(res.data.items[0].rating === "like")) {
                        tmpVideos.push(videos[i]);
                    }
                })
            }
            io.to(usernames[usernames.findIndex(e => e.username === u1)].socket).emit("loadvideo", tmpVideos);
        }
    })

    app.post("/post", async (req, res) => {

        let notFound = false;
        await axios.get(`https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=${req.body.videoUrl}&key=${apiKey}`)
            .then(res => {
                if (!res.data.items[0]) {
                    console.log("Video not found")
                    socket.emit("error")
                    notFound = true;
                    return;
                }
            })


        if (!notFound) {
            const user = await User.findOne({ username: req.body.username });
            const username = user.username;
            const points = user.points;
            await user.save();
            const videoVorhanden = await Video.findOne({ url: req.body.videoUrl })
            if (!videoVorhanden) {
                const video = new Video({
                    user: req.session.username,
                    url: req.body.videoUrl,
                    points: req.body.points
                })
                await video.save();
                socket.emit("success");
                res.redirect("/");
            }
            else {
                socket.emit("error")
            }
        }
    })

    app.get("/freepoints", requireLogin, async (req, res) => {
        const user = await User.findOneAndUpdate({ username: `${req.session.username}` }, { "$inc": { "points": 100 } })
        res.send("Free points added :)")
    })

    app.post("/register", async (req, res) => {

        const username0 = req.body.username;
        const user1 = await User.findOne({ username: `${username0}` })

        if (user1) {
            res.render("usernametaken.ejs")
        }

        else {
            const hash = await bcrypt.hash(req.body.password, 12);
            const user = new User({
                username: req.body.username,
                password: hash,
                points: 0
            })
            await user.save();
            req.session.user_id = user.id;
            req.session.username = req.body.username;
            res.redirect("/")
        }
    })

})


app.post("/logout", (req, res) => {
    req.session.user_id = null;
    res.redirect("/login");
})

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})