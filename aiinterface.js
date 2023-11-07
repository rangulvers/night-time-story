require('dotenv').config()
const OpenAI = require('openai');


const openai = new OpenAI({apiKey: process.env.OPEN_AI_APIKEY})
const ai_model = "gpt-3.5-turbo"
const ai_image_model = "dall-e-3"
let oneLineStorySummary = ""
let userStoryInput = ""
let generatedStory = ""
let generatedSummary =""
const storyParts = []

const getStory = async (input, callback) => {
    userStoryInput = input;

    try {
        const story = await generateStory();
        const summary = await generateSummaryFromStory(story);

        // Split the story into lines and generate images for each line
        const lines = story.split('\n\n').filter(line => line.trim() !== '');
        
        // Use map to return a promise for each image generation, then wrap all with Promise.all
        const partsPromises = lines.map(async (line) => {
            const imageDescription = await generateImageDescription(line, summary); // Pass the summary for context
            const image = await generateImage(imageDescription);
            return { text: line, imageUrl: image.url, alternativeText: imageDescription };
        });

        const parts = await Promise.all(partsPromises); // Resolves all the promises from the map

        // Check if callback is a function before calling it
        if (typeof callback === 'function') {
            callback(null, { story: story, summary: summary, storyParts: parts });
        } else {
            throw new Error('Callback is not a function');
        }
    } catch (error) {
        if (typeof callback === 'function') {
            callback(error);
        } else {
            console.error('An error occurred, and the callback provided is not a function:', error);
        }
    }
};

async function generateStory(){
    const instructions = "You are an award-winning kids' book author. Your task is to generate a kid-friendly PG-0 Story. Write the Story in paragraphs based on the following input: ";
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: userStoryInput }
    ];

    const response = await openai.chat.completions.create({
        model: ai_model,
        messages: messages,
        max_tokens: 100,
    });

    // Corrected the response handling here
    return response.choices[0].message.content.trim();

}

async function generateSummaryFromStory(){
    const instructions = "Based on the story, generate a short description of the characters (how they look, feelings) and the story in under 50 words.";
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: generatedStory }
    ]

    const response = await openai.chat.completions.create({
        model: ai_model,
        messages: messages,
    });

    // Corrected the response handling here
    return response.choices[0].message.content.trim();
}

async function generateImageDescription(line, generatedSummary){
    const instructions = "You are a creative illustrator designing for kids books and you need to describe an image based on a single line of text. The image needs to be appropiate for a kids book and in the style of a colorful comic. Describe the image in less then 50 words.  The context of the image needs to be the story about "+generatedSummary;
    const messages = [
        { role: "system", content: instructions },
        { role: "user", content: line }
    ];
    
    const response = await openai.chat.completions.create({
        model: ai_model,
        messages: messages
    });
    
    

    return response.choices[0].message.content.trim();
}

async function generateImage(imageDescription){

    const response = await openai.images.generate({
        quality:"standard",
        model:"dall-e-3",
        prompt: imageDescription,
        n: 1,
        size: "1024x1024"
    });
    
    const imageUrl = response.data[0].url;
    return { prompt: imageDescription, url: imageUrl };
}

async function generateStoryTitle(){

}

module.exports = {
    getStory
}