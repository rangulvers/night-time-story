const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const OpenAIAPI= require('openai');
const { hostname } = require('os');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = 3000;
const aiModel = "gpt-3.5-turbo";
let oneLineSummary ="";

// Setup your OpenAI API Key
const openai = new OpenAIAPI({ apiKey:'' }); // Make sure to use your real API key here

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index', { story: null, images: [] });
});

// Setup socket.io connection
io.on('connection', (socket) => {
    console.log('a user connected');

    // Listen for story generation request
    socket.on('generateStory', async (textInput) => {
        console.log('Generating story with input:', textInput);
        try {
            // Call OpenAI API to generate the story
            const generatedStory = await generateStory(textInput);
            oneLineSummary = await generateSummary(generatedStory);

            // Call OpenAI API to get images for each line in the story
            const lines = generatedStory.split('\n');
            for (const line of lines) {
                const imageDescription = await generateImageDescription(line);
                const image = await callOpenAIForImage(imageDescription);
                socket.emit('newImage', image.url); // Emit new image to the client
            }
            socket.emit('storyGenerated', { story: generatedStory });
        } catch (error) {
            console.error('Error generating story or images:', error);
            socket.emit('error', 'An error occurred while generating the story or images');
        }
    });
});

async function generateStory(prompt) {
    const instructions = "You are an award winning kids book author. Your task is to generate a kid friendly PG-0 Story. Write the Story in paragraphs based on the following input : ";
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: aiModel,
        messages: messages,
        max_tokens: 50,
    });
    
    console.log(response);
    return response.choices[0].message.content.trim();
}

// function to generate a one line summary of the main story
async function generateSummary(story) {
    const instructions = "Generate a one line summary of the story. Make sure to include all relavant details about the characters.";
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: story }
    ];

    const response = await openai.chat.completions.create({
        model: aiModel,
        messages: messages,
        max_tokens: 100,
    });
    
    console.log(response);
    return response.choices[0].message.content.trim();
}

async function generateImageDescription(story){
    const instructions = "You are a creative drawing artist. You are tasked with drawing a picture based on the following description. Keep in mind that it is in the context of "+oneLineSummary+".";
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: story }
    ];

    const response = await openai.chat.completions.create({
        model: aiModel,
        messages: messages,
        max_tokens: 100,
    });
    
    console.log(response);
    return response.choices[0].message.content.trim();
}

async function callOpenAIForImage(prompt) {
    console.log(prompt)
    const response = await openai.images.generate({
        prompt: prompt,
        n: 1,
        size: "1024x1024"
    });
    
    const imageUrl = response.data[0].url;
    return { prompt: prompt, url: imageUrl };
}

httpServer.listen(port, () => {
    console.log(`Server is running on ${hostname}:${port}`);
});