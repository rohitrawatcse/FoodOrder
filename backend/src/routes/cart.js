import express from "express";
import Cart from "../models/Cart.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Add to cart
router.post("/", verifyToken, async (req, res) => {
  const { userId, productId, quantity } = req.body;
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({ userId, items: [{ productId, quantity }] });
  } else {
    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (item) item.quantity += quantity;
    else cart.items.push({ productId, quantity });
  }

  await cart.save();
  res.json(cart);
});

export default router;
