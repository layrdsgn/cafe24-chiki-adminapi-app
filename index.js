const express = require('express');
const fetch = require('node-fetch'); // ⬅️ node-fetch 라이브러리 불러오기
const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`;
const mallId = 'dustpark';

let accessToken = null;

// 1. Access Token 발급/확인 (Vercel 앱 첫 접속 페이지)
app.get('/', async (req, res) => {
    if (!accessToken) {
        const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=mall.read_product,mall.read_collection`;
        return res.redirect(authUrl);
    }
    res.send(`Access Token이 이미 발급되었습니다. 토큰: ${accessToken}`);
});

// 2. Access Token 발급 처리
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    // ... (이 부분은 이전 코드와 동일) ...
    try {
        // ... (token 발급 로직) ...
        const data = await response.json();
        accessToken = data.access_token;
        res.send(`<h1>Access Token 발급 성공!</h1><p>이제 쇼핑몰의 팝업에서 관련 상품을 불러올 수 있습니다.</p>`);
    } catch (error) {
        // ...
    }
});

// 3. 관련 상품 API (프록시)
app.get('/api/products', async (req, res) => {
    const productNos = req.query.product_no;

    if (!accessToken) {
        return res.status(401).json({ error: '인증 토큰이 없습니다. 먼저 / 주소로 접속해 인증해주세요.' });
    }
    if (!productNos) {
        return res.status(400).json({ error: '상품 번호가 필요합니다.' });
    }

    try {
        // API를 한번만 호출하여 여러 상품 정보를 가져옵니다.
        const url = `https://${mallId}.cafe24api.com/api/v2/admin/products?product_no=${productNos}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: 'API 호출 실패', message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});