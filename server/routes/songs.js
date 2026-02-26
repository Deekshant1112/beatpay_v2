// routes/songs.js
const express = require('express');
const router = express.Router();
const { addSong, getSongs, getCurrentSongs, deleteSong } = require('../controllers/songController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validateSong } = require('../middlewares/validate');

router.use(authenticate);

router.get('/current', getCurrentSongs);           // All users - songs in active round
router.get('/', authorize('dj'), getSongs);        // DJ - own playlist
router.post('/', authorize('dj'), validateSong, addSong);
router.delete('/:id', authorize('dj'), deleteSong);

module.exports = router;
