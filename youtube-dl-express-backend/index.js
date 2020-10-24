import fs from 'fs-extra';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import videoRouter from './routes/video.route.js';
import uploaderRouter from './routes/uploader.route.js';
import statisticRouter from './routes/statistic.route.js';
import adminRouter from './routes/admin.route.js';

import authenticationMiddleware from './middleware/authentication.middleware.js';
import globalPasswordMiddleware from './middleware/global-password.middleware.js';
import superuserMiddleware from './middleware/superuser.middleware.js';

import User from './models/user.model.js';

// Validate enviornment variables
if (process.env.OUTPUT_DIRECTORY.endsWith('/')
    || process.env.OUTPUT_DIRECTORY.endsWith('\\')
) {
    process.env.OUTPUT_DIRECTORY = process.env.OUTPUT_DIRECTORY.slice(0, -1);
}

// Connect to the database
mongoose.connect(process.env.MONGOOSE_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
});

// Create the express server
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Add routes to the server
app.use('/api/auth', globalPasswordMiddleware, authRouter);
app.use('/api/users', [globalPasswordMiddleware, authenticationMiddleware], userRouter);
app.use('/api/videos', globalPasswordMiddleware, videoRouter);
app.use('/api/uploaders', globalPasswordMiddleware, uploaderRouter);
app.use('/api/statistics', globalPasswordMiddleware, statisticRouter);
app.use('/api/admin', [globalPasswordMiddleware, authenticationMiddleware, superuserMiddleware], adminRouter);

const staticFolders = ['videos', 'thumbnails', 'avatars'];
const outputDirectory = process.env.OUTPUT_DIRECTORY;

// Create the static folders
for (let folder of staticFolders) {
    fs.ensureDirSync(path.join(outputDirectory, folder));
    app.use('/static/' + folder, globalPasswordMiddleware, express.static(path.join(outputDirectory, folder)));
}

// Transcode videos
app.use('/transcoded/videos', globalPasswordMiddleware, (req, res) => {
    res.contentType('webm');
    const videoPath = path.join(outputDirectory, 'videos', decodeURIComponent(req.path));
    ffmpeg(videoPath)
        .format('webm')
        .pipe(res, { end: true });
});

// Serve the react app build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('../youtube-dl-react-frontend/build'));
    app.get('*', (req, res) => {
        res.sendFile(path.join(
            path.join(process.cwd(), '../youtube-dl-react-frontend/build/index.html')
        ));
    });
}

// Start the server
const backendPort = process.env.BACKEND_PORT;
app.listen(backendPort, () => {
    console.log('Server started on port:', backendPort);
});

// Create the superuser
const superuserUsername = process.env.SUPERUSER_USERNAME;
const superuserPassword = process.env.SUPERUSER_PASSWORD;
const user = new User({
    username: superuserUsername,
    password: superuserPassword,
    isSuperuser: true
});
user.save(function (err) {
    if (err && (err.name !== 'MongoError' || err.code !== 11000)) {
        throw err;
    }
});
