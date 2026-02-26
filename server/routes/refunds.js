const express = require('express');
const router = express.Router();
const { getMyRefunds } = require('../controllers/refundController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/role');

router.get('/my', authenticate, authorize('user'), getMyRefunds);

module.exports = router;