// api/products.js

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());

// Vercel Serverless Function은 매 요청마다 초기화되므로,
// 토큰 정보를 외부에서 가져오거나 다시 인증해야 함.
// 여기서는 토큰이 이미 저장되어 있다고 가정합니다.
// 실제 운영 시에는 DB나 다른 영구 저장소에서 토큰을 가져와야 합니다.
let tokenInfo = {
    accessToken: "YOUR_ACCESS_TOKEN", // ✅ 여기에 발급받은 토큰을 넣어주세요!
    refreshToken: null,
    expiresAt: new Date().getTime() + 3600 * 1000, // 1시간 후 만료로 가정
};

// 미들웨어
function ensureAuth(req, res, next) {
    const now = new Date().getTime();
    if (!tokenInfo || !tokenInfo.accessToken || (tokenInfo.expiresAt && now > tokenInfo.expiresAt)) {
        return res.status(401).json({ error: 'Access Token이 없습니다. 또는 만료되었습니다. 다시 인증해주세요.' });
    }
    next();
}

// 상품 조회 API
// 이 파일 자체의 경로가 /api/products 이므로, Express 라우트는 '/'로 설정
app.get('/', ensureAuth, async (req, res) => {
    const { product_no, product_code } = req.query;

    if (!product_no && !product_code) {
        return res.status(400).json({ error: 'product_no 또는 product_code 쿼리가 필요합니다.' });
    }

    const mallId = 'dustpark';
    let url;

    if (product_no) {
        url = `https://${mallId}.cafe24api.com/api/v2/admin/products?product_no=${product_no}`;
    } else if (product_code) {
        url = `https://${mallId}.cafe24api.com/api/v2/admin/products?product_code=${product_code}`;
    }

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
