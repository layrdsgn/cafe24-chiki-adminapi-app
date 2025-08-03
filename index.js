const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`;
const mallId = 'dustpark';

// 토큰 정보를 저장할 변수 (실제 서비스에서는 DB에 저장해야 합니다)
let tokenInfo = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
};

// Access Token을 자동으로 갱신하는 함수
async function refreshToken() {
    try {
        const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
        const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=refresh_token&refresh_token=${tokenInfo.refreshToken}`,
        });

        const data = await response.json();
        if (data.error) { throw new Error(data.error_description); }

        // 새로 발급받은 토큰 정보 업데이트
        tokenInfo.accessToken = data.access_token;
        tokenInfo.refreshToken = data.refresh_token;
        // 현재 시간 기준으로 만료 시간 계산 (초 단위)
        tokenInfo.expiresAt = new Date().getTime() + (data.expires_in * 1000);
        
        console.log('Access Token이 성공적으로 갱신되었습니다.');

    } catch (error) {
        console.error('Access Token 갱신 실패:', error);
        // 갱신 실패 시 토큰 정보 초기화
        tokenInfo.accessToken = null;
        tokenInfo.refreshToken = null;
        tokenInfo.expiresAt = null;
    }
}

// 1. 인증 시작 페이지
app.get('/', (req, res) => {
    // ‼️ scope에 offline_access를 추가하여 refresh_token을 요청합니다.
    const scope = 'mall.read_product,mall.read_collection,offline_access';
    const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(authUrl);
});

// 2. Access Token 최초 발급
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) { return res.status(400).send('인증 코드가 없습니다.'); }

    try {
        const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
        const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
        });

        const data = await response.json();
        if (data.error) { throw new Error(data.error_description); }

        // 받아온 토큰 정보를 변수에 저장
        tokenInfo.accessToken = data.access_token;
        tokenInfo.refreshToken = data.refresh_token;
        tokenInfo.expiresAt = new Date().getTime() + (data.expires_in * 1000);

        res.send(`<h1>인증 성공!</h1><p>이제 쇼핑몰 팝업에서 관련 상품을 불러올 수 있습니다.</p>`);
    } catch (error) {
        res.status(500).send(`Access Token 발급 실패: ${error.message}`);
    }
});

// 3. 관련 상품 API (프록시)
app.get('/api/products', async (req, res) => {
    const productNos = req.query.product_no;

    // 토큰이 만료되었는지 확인하고, 만료되었다면 갱신
    if (tokenInfo.expiresAt && new Date().getTime() > tokenInfo.expiresAt) {
        await refreshToken();
    }

    if (!tokenInfo.accessToken) {
        return res.status(401).json({ error: '인증이 필요합니다. <a href="/">여기</a>를 클릭하여 인증을 시작하세요.' });
    }
    if (!productNos) {
        return res.status(400).json({ error: '상품 번호가 필요합니다.' });
    }

    try {
        const url = `https://${mallId}.cafe24api.com/api/v2/admin/products?product_no=${productNos}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${tokenInfo.accessToken}` }
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