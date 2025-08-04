const express = require('express');
const fetch = require('node-fetch');
const app = express();
const cors = require('cors');
app.use(cors());

const mallId = 'dustpark';
const ensureAuth = require('../authMiddleware');

app.get('*', ensureAuth, async (req, res) => {
  const productNo = req.query.product_no;
  if (!productNo) {
    return res.status(400).json({ error: '상품 번호가 없습니다.' });
  }

  const tokenInfo = req.app.locals.tokenInfo;
  const url = `https://${mallId}.cafe24api.com/api/v2/admin/products/${productNo}/relation-products`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenInfo.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error_description || '관련 상품 응답 에러');
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '관련 상품 불러오기 실패', message: error.message });
  }
});

module.exports = app;