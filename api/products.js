const express = require('express');
const fetch = require('node-fetch');
const app = express();
const cors = require('cors');
app.use(cors());

const mallId = 'dustpark';
const ensureAuth = require('../authMiddleware');

app.get('*', ensureAuth, async (req, res) => {
  const { product_no, product_code } = req.query;
  if (!product_no && !product_code) {
    return res.status(400).json({ error: 'product_no 또는 product_code 쿼리가 필요합니다.' });
  }

  const tokenInfo = req.app.locals.tokenInfo;
  let url = product_no
    ? `https://${mallId}.cafe24api.com/api/v2/admin/products?product_no=${product_no}`
    : `https://${mallId}.cafe24api.com/api/v2/admin/products?product_code=${product_code}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenInfo.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'API 요청 실패', message: error.message });
  }
});

module.exports = app;