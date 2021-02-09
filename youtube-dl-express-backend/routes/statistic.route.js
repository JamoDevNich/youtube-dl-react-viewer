import express from 'express';

import Statistic from '../models/statistic.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' })
            .populate({
                path: 'statistics.recordViewCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordLikeCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordDislikeCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.oldestVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!statistic) {
        try {
            statistic = await new Statistic().save();
        } catch (err) {
            return res.sendStatus(500);
        }
    }

    statistic = statistic.toJSON();
    const returnTags = 5;
    statistic.statistics.tags.slice(0, returnTags);
    statistic.statistics.categories.slice(0, returnTags);
    statistic.statistics.hashtags.slice(0, returnTags);

    res.json({ statistic: statistic.statistics });
});

export default router;
