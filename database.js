// database.js
const sqlite3 = require('sqlite3').verbose();

// Setup the database connection
const db = new sqlite3.Database('stories.db', (err) => {
    if (err) {
        console.error(err.message);
        throw err; // handle error appropriately in your real-world app
    }
    console.log('Connected to the SQLite database.');
});

const getAllStories = (callback) => {
    db.all('SELECT * FROM stories', [], (err, stories) => {
        if (err) {
            callback(err, null);
            return;
        }

        let storiesWithDetails = [];
        let storiesProcessed = 0;

        if (stories.length === 0) {
            callback(null, []); // No stories found
            return;
        }

        stories.forEach((story) => {
            db.all('SELECT * FROM parts WHERE story_id = ? ORDER BY sequence', [story.id], (err, parts) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                story.parts = [];

                let partsProcessed = 0;

                if (parts.length === 0) {
                    checkIfFinished(); // Check if all stories have been processed
                    return;
                }

                parts.forEach((part, index) => {
                    db.all('SELECT * FROM images WHERE part_id = ?', [part.id], (err, images) => {
                        if (err) {
                            callback(err, null);
                            return;
                        }

                        parts[index].images = images;
                        partsProcessed++;

                        if (partsProcessed === parts.length) {
                            story.parts = parts;
                            checkIfFinished();
                        }
                    });
                });
            });

            const checkIfFinished = () => {
                storiesProcessed++;
                if (storiesProcessed === stories.length) {
                    callback(null, stories);
                }
            };
        });
    });
};
// Function to insert a story with its parts and images
const saveStory = (socketId, title, partsWithImages, callback) => {
    // Start a serialized transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert into stories table
        const stmt = db.prepare('INSERT INTO stories (socket_id, title) VALUES (?, ?)');
        stmt.run(socketId, title, function(err) {
            if (err) {
                db.run('ROLLBACK');
                callback(err);
                return;
            }

            const storyId = this.lastID; // Get the last inserted ID of the story
            
            // Insert parts and images
            partsWithImages.forEach((part, index) => {
                const stmtPart = db.prepare('INSERT INTO parts (story_id, content, sequence) VALUES (?, ?, ?)');
                stmtPart.run(storyId, part.text, index + 1, function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        callback(err);
                        return;
                    }

                    const partId = this.lastID;
                    const stmtImage = db.prepare('INSERT INTO images (part_id, image_url, alternative_text) VALUES (?, ?, ?)');
                    stmtImage.run(partId, part.imageUrl, part.alternativeText, (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            callback(err);
                            return;
                        }
                    });
                    stmtImage.finalize();
                });
                stmtPart.finalize();
            });
        });
        stmt.finalize();

        db.run('COMMIT', (err) => {
            if (err) {
                callback('Commit failed', err);
                db.run('ROLLBACK');
            } else {
                console.log('Story and parts successfully saved!');
                callback(null);
            }
        });
    });
};

module.exports = {
    saveStory,
    getAllStories
    // Any other functions you want to export
};
