// routes/cardRoutes.js
const express = require('express');
const { listCards, editCardForm, updateCard, deleteCard } = require('../controllers/cardController');
const authenticateJWT = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticateJWT, listCards);
router.get('/edit/:id', authenticateJWT, editCardForm);
router.post('/edit/:id', authenticateJWT, updateCard);
router.get('/delete/:id', authenticateJWT, deleteCard);

module.exports = router;
