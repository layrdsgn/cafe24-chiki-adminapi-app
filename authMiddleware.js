module.exports = function ensureAuth(req, res, next) {
  const tokenInfo = req.app.locals.tokenInfo;
  const now = new Date().getTime();
  if (!tokenInfo.accessToken || now > tokenInfo.expiresAt) {
    return res.status(401).json({ error: 'Access Token이 없습니다. / 인증이 필요합니다.' });
  }
  next();
};