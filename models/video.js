const mongoose = require("mongoose")

const videoSchema = new mongoose.Schema({
    
    user: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model("Video", videoSchema);