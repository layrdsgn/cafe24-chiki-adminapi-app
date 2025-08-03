const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`;
const mallId = 'dustpark';

// Access Token을 임시로 저장할 변수
let accessToken = null;

// 1. 인증 코드 받기 (시작 페이지)
app.get('/', (req, res) => {
    const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=mall.read_product`;
    res.redirect(authUrl);
});

// 2. Access Token 발급받기
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('인증 코드가 없습니다.');
    }

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
        if (data.error) { throw new Error(data.error_description); }

        // Access Token을 변수에 저장
        accessToken = data.access_token;

        // 성공 메시지와 함께 상품 목록을 볼 수 있는 링크를 보여줌
        res.send(`
            <h1>Access Token 발급 성공!</h1>
            <p>이제 아래 링크를 클릭해서 상품 목록을 가져올 수 있습니다.</p>
            <a href="/products">상품 목록 보기</a>
        `);

    } catch (error) {
        res.status(500).send(`Access Token 발급 실패: ${error.message}`);
    }
});

// 3. API 호출하여 상품 목록 가져오기 (새로 추가된 페이지)
app.get('/products', async (req, res) => {
    if (!accessToken) {
        return res.send('먼저 Access Token을 발급받아 주세요. <a href="/">인증 시작하기</a>');
    }

    try {
        const productsUrl = `https://${mallId}.cafe24api.com/api/v2/admin/products`;
        
        const response = await fetch(productsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        if (data.error) { throw new Error(data.error_description); }

        // 성공적으로 받은 상품 목록 데이터를 화면에 표시
        res.json(data);

    } catch (error) {
        res.status(500).send(`상품 목록 조회 실패: ${error.message}`);
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});