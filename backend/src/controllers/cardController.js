// controllers/cardController.js
const Card = require('../models/Card');

exports.listCards = async (req, res) => {
  const { search, page = 1, filter } = req.query;
  const limit = 5;
  const offset = (page - 1) * limit;

  let where = {};
  if (search) where.title = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await Card.findAndCountAll({ where, limit, offset });

  res.render('index', {
    cards: rows,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    search,
    filter
  });
};


// Edit Card (Render Edit Form)
exports.editCardForm = async (req, res) => {
  const card = await Card.findByPk(req.params.id);
  if (!card) return res.redirect('/');
  res.render('edit', { card });
};

// Update Card (POST)
exports.updateCard = async (req, res) => {
  const { title, description } = req.body;
  await Card.update({ title, description }, { where: { id: req.params.id } });
  res.redirect('/');
};

// Delete Card
exports.deleteCard = async (req, res) => {
  await Card.destroy({ where: { id: req.params.id } });
  res.redirect('/');
};
