const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { predictRisk, trainModel, aiSummary } = require("../controllers/aiController");

const router = express.Router();

router.use(authenticate, authorize("admin", "teacher", "parent"));
router.get("/risk-summary", predictRisk);
router.post("/train", authorize("admin"), trainModel);
router.get("/summary", aiSummary);

module.exports = router;
