const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// 환경 변수
const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`;
const mallId = 'dustpark';

// 토큰 저장소 (DB 없는 컴맹용)
let tokenInfo = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
};

// ✅ access_token 만료 여부 확인
function isTokenExpired() {
    return !tokenInfo.expiresAt || new Date().getTime() > tokenInfo.expiresAt;
}

// ✅ 자동 갱신 함수
async function refreshAccessToken() {
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
    if (data.error) throw new Error(data.error_description);

    tokenInfo.accessToken = data.access_token;
    tokenInfo.refreshToken = data.refresh_token; // 중요: 새로 받을 수 있음
    tokenInfo.expiresAt = new Date().getTime() + (data.expires_in * 1000);

    console.log('✅ Access Token 자동 갱신 성공');
}

// ✅ 인증 상태 체크 미들웨어
async function ensureAuthenticated(req, res, next) {
    if (!tokenInfo.accessToken) {
        return res.status(401).send('🔒 인증이 필요합니다. <a href="/">여기</a>를 눌러 인증을 시작하세요.');
    }

    if (isTokenExpired()) {
        try {
            await refreshAccessToken();
        } catch (error) {
            return res.status(401).send('🔄 토큰 갱신 실패. <a href="/">인증 다시 하기</a>');
        }
    }

    next(); // 통과
}

// ✅ 인증 시작
app.get('/', (req, res) => {
    const scope = 'mall.read_product'; // refresh_token 포함됨
    const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(authUrl);
});

// ✅ 콜백: 토큰 받기
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('❌ 인증 코드가 없습니다.');

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
    if (data.error) return res.status(500).send(`토큰 발급 실패: ${data.error_description}`);

    tokenInfo.accessToken = data.access_token;
    tokenInfo.refreshToken = data.refresh_token;
    tokenInfo.expiresAt = new Date().getTime() + (data.expires_in * 1000);

    res.send(`<h1>🎉 인증 완료!</h1><p><a href="/products">→ 상품 목록 보기</a></p>`);
});

// ✅ 상품 목록 API (보호됨)
app.get('/products', ensureAuthenticated, async (req, res) => {
    try {
        const apiUrl = `https://${mallId}.cafe24api.com/api/v2/admin/products`;
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${tokenInfo.accessToken}`,
            },
        });
        const data = await response.json();

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: '상품 API 실패', message: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});
