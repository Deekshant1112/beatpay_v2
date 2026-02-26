// routes/rounds.js
const express = require('express');
const router = express.Router();
const { startRound, endRound, getActiveRound, getRoundHistory } = require('../controllers/roundController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

router.use(authenticate);

router.get('/active', getActiveRound);                          // All users
router.get('/history', authorize('dj'), getRoundHistory);      // DJ only
router.post('/start', authorize('dj'), startRound);            // DJ only
router.post('/:id/end', authorize('dj'), endRound);            // DJ only

module.exports = router;
