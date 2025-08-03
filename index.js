const express = require('express');
const fetch = require('node-fetch');
const ensureAuth = require('./authMiddleware');
const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`;
const mallId = 'dustpark';

app.locals.tokenInfo = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
};

// 1. 인증 시작
app.get('/', (req, res) => {
    const scope = 'mall.read_product'; // ✅ 최소 권한만
    const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(authUrl);
});

// 2. 인증 콜백
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('인증 코드가 없습니다.');

    try {
        const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
        const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error_description);

        app.locals.tokenInfo = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date().getTime() + data.expires_in * 1000,
        };

        res.send(`<h1>✅ 인증 성공</h1><p><a href="/api/products?product_no=1,2,3">상품 정보 테스트</a></p>`);
    } catch (err) {
        res.status(500).send('토큰 발급 실패: ' + err.message);
    }
});

// 3. 상품 조회 API (미들웨어로 보호)
app.get('/api/products', ensureAuth, async (req, res) => {
    const { product_no } = req.query;
    if (!product_no) return res.status(400).json({ error: 'product_no 쿼리가 필요합니다.' });

    try {
        const tokenInfo = req.app.locals.tokenInfo;
        const url = `https://${mallId}.cafe24api.com/api/v2/admin/products?product_no=${product_no}`;

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

app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
