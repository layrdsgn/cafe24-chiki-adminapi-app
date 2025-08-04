const express = require('express'); // ✅ 꼭 있어야 함
const fetch = require('node-fetch');
const ensureAuth = require('../authMiddleware');
const app = express();
const cors = require('cors');
app.use(cors());
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
// 이 경로는 vercel.json의 /api 라우팅 규칙에 포함되지 않으므로 그대로 둡니다.
app.get('/', (req, res) => {
    const scope = 'mall.read_product'; // ✅ 최소 권한만
    const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    res.redirect(authUrl);
});

// 2. 인증 콜백
// 이 경로는 vercel.json의 /api 라우팅 규칙에 포함되지 않으므로 그대로 둡니다.
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

        // 이제 상품 조회 API는 /api/products로 접근 가능합니다.
        res.send(`<h1>✅ 인증 성공</h1><p><a href="/api/products?product_no=1,2,3">상품 정보 테스트</a></p>`);
    } catch (err) {
        res.status(500).send('토큰 발급 실패: ' + err.message);
    }
});

// 3. 상품 조회 API (미들웨어로 보호)
// ✅ /api 접두사를 제거하여 '/products'로 수정
app.get('/products', ensureAuth, async (req, res) => {
    const { product_no, product_code } = req.query;

    if (!product_no && !product_code) {
        return res.status(400).json({ error: 'product_no 또는 product_code 쿼리가 필요합니다.' });
    }

    const tokenInfo = req.app.locals.tokenInfo;
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

// 관련 상품 API (비동기 요청 처리용)
// ✅ /api 접두사를 제거하여 '/related'로 수정
app.get('/related', ensureAuth, async (req, res) => {
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