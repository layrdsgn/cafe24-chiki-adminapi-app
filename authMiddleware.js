// authMiddleware.js

module.exports = function ensureAuth(req, res, next) {
    const tokenInfo = req.app.locals.tokenInfo;

    if (!tokenInfo || !tokenInfo.accessToken) {
        return res.status(401).json({ error: 'Access Token이 없습니다. / 인증이 필요합니다.' });
    }

    // 만료되었으면 갱신
    const now = new Date().getTime();
    if (tokenInfo.expiresAt && now > tokenInfo.expiresAt) {
        return res.status(401).json({ error: 'Access Token이 만료되었습니다. 다시 인증해주세요.' });
    }

    next(); // 통과
};
