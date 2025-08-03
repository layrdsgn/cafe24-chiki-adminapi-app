const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Vercel 환경변수 가져오기
const clientId = process.env.CAFE24_CLIENT_ID;
const clientSecret = process.env.CAFE24_CLIENT_SECRET;
const redirectUri = `https://cafe24-chiki-adminapi-app.vercel.app/oauth/callback`; // ‼️ {your-app-name} 부분을 실제 Vercel 주소로 변경하세요.

// 1. 인증 코드 받기 (사용자가 처음 접속할 페이지)
app.get('/', (req, res) => {
    const authUrl = `https://dustpark.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=mall.read_product`; // ‼️ {mall_id}를 실제 쇼핑몰 ID로 변경하세요.
    res.redirect(authUrl);
});

// 2. Access Token 발급받기 (인증 후 리디렉션될 페이지)
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('인증 코드가 없습니다.');
    }

    try {
        const tokenUrl = `https://{mall_id}.cafe24api.com/api/v2/oauth/token`; // ‼️ {mall_id}를 실제 쇼핑몰 ID로 변경하세요.
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
        
        if (data.error) {
            throw new Error(data.error_description);
        }

        // 성공적으로 받은 Access Token을 화면에 표시
        res.json(data);

    } catch (error) {
        res.status(500).send(`Access Token 발급 실패: ${error.message}`);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});