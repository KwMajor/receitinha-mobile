const { Router } = require('express');
const crypto = require('crypto');
const auth = require('../../middleware/auth');

const router = Router();
router.use(auth);

// GET /api/user/photos/sign?folder=recipes/uid/recipeId
// Retorna os parâmetros assinados para o mobile fazer upload direto ao Cloudinary
router.get('/sign', (req, res) => {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return res.status(503).json({ message: 'Serviço de upload não configurado.' });
  }

  const folder = req.query.type === 'video'
    ? `recipes/videos/${req.user.uid}`
    : `recipes/${req.user.uid}`;
  const timestamp = Math.round(Date.now() / 1000);

  // Assina exatamente os parâmetros que serão enviados ao Cloudinary
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha256').update(toSign).digest('hex');

  res.json({ signature, timestamp, apiKey, cloudName, folder });
});

module.exports = router;
