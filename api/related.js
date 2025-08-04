// api/related.js

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

// 관련 상품 API
// 이 파일 자체의 경로가 /api/related 이므로, Express 라우트는 '/'로 설정
app.get('/', ensureAuth, async (req, res) => {
    const productNo = req.query.product_no;

    if (!productNo) {
        return res.status(400).json({ error: '상품 번호가 없습니다.' });
    }

    const mallId = 'dustpark';
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
