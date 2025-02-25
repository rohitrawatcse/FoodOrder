import express from "express";
import Order from "../models/Order.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get user orders
router.get("/", verifyToken, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id });
  res.json(orders);
});

// Update order status (Admin only)
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  order.status = req.body.status;
  await order.save();
  res.json(order);
});

export default router;
