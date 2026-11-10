// pb-sesion.js — Sesión de PocketBase sin SDK. Expone window.PBSesion.
// Guarda y expone el id, el correo y el nombre del usuario, el token y las
// cabeceras de autorización que deben enviarse en TODAS las peticiones a PocketBase.
(function () {
  var CLAVE = 'pb_auth';

  function decodificar(token) {
    try {
      return JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (_) {
      return null;
    }
  }

  function tokenVigente(token) {
    var p = decodificar(token);
    if (!p) return false;
    return !p.exp || p.exp * 1000 > Date.now();
  }

  // Devuelve la sesión guardada si el token sigue vigente; si no, null
  function leer() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (_) { s = null; }
    if (!s || !s.token || !tokenVigente(s.token)) return null;
    return s;
  }

  // Datos del usuario: id, correo y nombre
  function user() {
    var s = leer();
    if (!s) return null;
    var r = s.record || {};
    return {
      id: r.id || s.user_id || null,
      email: r.email || s.email || null,
      nombre: r.name || s.nombre || null
    };
  }

  function id() {
    var u = user();
    return u ? u.id : null;
  }

  // Cabeceras con el token de autorización (para todas las peticiones a PocketBase)
  function headers(extra) {
    var h = Object.assign({}, extra || {});
    var s = leer();
    if (s && s.token) h.Authorization = 'Bearer ' + s.token;
    return h;
  }

  function cerrar() {
    localStorage.removeItem(CLAVE);
    location.replace('/index.html');
  }

  // Guardia de página: si no hay sesión válida, vuelve al login
  function exigir() {
    if (!leer()) {
      localStorage.removeItem(CLAVE);
      location.replace('/index.html');
      return false;
    }
    return true;
  }

  window.PBSesion = {
    CLAVE: CLAVE,
    leer: leer,
    user: user,
    id: id,
    headers: headers,
    cerrar: cerrar,
    exigir: exigir
  };
})();
