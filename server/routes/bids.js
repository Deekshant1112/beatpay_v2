// routes/bids.js
const express = require('express');
const router = express.Router();
const { placeBid, getRoundBids, getMyBids } = require('../controllers/bidController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');
const { validateBid } = require('../middlewares/validate');

router.use(authenticate);

router.post('/', authorize('user'), validateBid, placeBid);
router.get('/my', authorize('user'), getMyBids);
router.get('/round/:roundId', getRoundBids);

module.exports = router;
