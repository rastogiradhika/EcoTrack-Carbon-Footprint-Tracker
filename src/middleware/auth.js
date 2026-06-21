// src/middleware/auth.js
// ─────────────────────────────────────────────
// Direct equivalent of Flask's @login_required decorator.
// Flask used: `if 'user_id' not in session: return redirect(url_for('login'))`
//
// Migration notes:
//   - Flask sessions → express-session (same concept, different library)
//   - For API routes: return 401 JSON instead of redirecting (frontend handles redirect)
//   - req.session.userId maps to Flask's session['user_id']
// ─────────────────────────────────────────────

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    // API call? Return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Page route? Redirect to login
    return res.redirect('/login');
  }
  next();
};

module.exports = { requireAuth };
