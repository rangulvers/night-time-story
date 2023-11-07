const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const hostname = require('os').hostname;
const { saveStory, getAllStories } = require('./database'); 
const { getStory } = require('./aiinterface');
const { text } = require('body-parser');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = 3000;
const aiModel = "gpt-3.5-turbo";
let oneLineSummary = "";

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});




// Setup socket.io connection
io.on('connection', (socket) => {
    console.log("User Connected with " + socket.id);

    // Listen for story generation request
    socket.on('generateStory', async (textInput) => {
        console.log("socket -> Generate Story -> "+textInput)
        try {

            getStory(textInput, (error, result) => {
                if (error) {
                    console.error('An error occurred:', error);
                } else {
                    console.log('Story generated:', result);

                    socket.emit("storyGenerationDone", {story: result.story, storyParts: result.storyParts})

                    saveStory(socket.id, textInput, result.storyParts, (err) => {
                        if (err) {
                            console.error('Failed to save story:', err);
                            // handle the error, e.g., by informing the user
                        } else {
                            console.log('Story saved successfully!');
                            // proceed with the next steps in your app
                        }
                    });
                }
            });

       

            // Emit all parts to the client once all images have been generated
           

        } catch (error) {
            console.error(error.message);
            socket.emit('error', 'An error occurred while generating the story or images. ' + error.message);
        }
    });
});

async function loadStories(){
    getAllStories((err, stories) => {
        if (err) {
            return(err)
        } else {
            return(stories)
         
        }
    });
}





httpServer.listen(port, () => {
    
});