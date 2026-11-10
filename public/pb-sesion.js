// pb-sesion.js — Sesión de PocketBase sin SDK. Expone window.PBSesion.
// Guarda y expone el id, el correo y el nombre del usuario, el token y las
// cabeceras de autorización que deben enviarse en TODAS las peticiones a PocketBase.
// Además renueva el token automáticamente (auth-refresh) cuando está por vencer
// o cuando el servidor responde 401.
(function () {
  var CLAVE = 'pb_auth';
  var PB = 'https://pb.infocatsoluciones.com';
  var COLECCION = 'users';
  // Se renueva el token cuando le queda menos de este margen de vida
  var MARGEN_RENOVACION = 24 * 60 * 60 * 1000; // 1 día

  function decodificar(token) {
    try {
      return JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch (_) {
      return null;
    }
  }

  function expiracion(token) {
    var p = decodificar(token);
    return p && p.exp ? p.exp * 1000 : null;
  }

  function tokenVigente(token) {
    var exp = expiracion(token);
    if (exp === null) return false;
    return exp > Date.now();
  }

  function porVencer(token, margen) {
    var exp = expiracion(token);
    if (exp === null) return false;
    return exp - Date.now() < (margen || MARGEN_RENOVACION);
  }

  // Sesión tal cual está guardada (aunque el token esté vencido)
  function crudo() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (_) { return null; }
  }

  // Devuelve la sesión solo si el token sigue vigente; si no, null
  function leer() {
    var s = crudo();
    if (!s || !s.token || !tokenVigente(s.token)) return null;
    return s;
  }

  // Guarda la respuesta de auth (login o refresh) preservando los datos de usuario
  function guardar(datos) {
    var previo = crudo() || {};
    var r = datos.record || previo.record || {};
    var s = {
      token: datos.token,
      record: r,
      meta: datos.meta || null,
      user_id: r.id || previo.user_id || null,
      email: r.email || previo.email || '',
      nombre: r.name || previo.nombre || ''
    };
    localStorage.setItem(CLAVE, JSON.stringify(s));
    return s;
  }

  // Datos del usuario: id, correo y nombre
  function user() {
    var s = crudo();
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

  // Cabeceras con el token de autorización (para peticiones a PocketBase)
  function headers(extra) {
    var h = Object.assign({}, extra || {});
    var s = crudo();
    if (s && s.token) h.Authorization = 'Bearer ' + s.token;
    return h;
  }

  function cerrar() {
    localStorage.removeItem(CLAVE);
    location.replace('/index.html');
  }

  // --- renovación del token ---------------------------------------------------

  var renovando = null; // promesa compartida para evitar renovaciones simultáneas

  // Pide un token nuevo a PocketBase usando el token actual.
  // Devuelve una promesa con true si se renovó, false si no fue posible.
  function renovar() {
    if (renovando) return renovando;
    var s = crudo();
    if (!s || !s.token) return Promise.resolve(false);

    renovando = fetch(PB + '/api/collections/' + COLECCION + '/auth-refresh', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + s.token }
    }).then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (datos) { guardar(datos); return true; });
    }).catch(function () {
      return false;
    }).then(function (ok) {
      renovando = null;
      return ok;
    });

    return renovando;
  }

  // --- fetch con auto-renovación ----------------------------------------------

  // Hace la petición con el token actual; si el servidor responde 401,
  // intenta renovar el token y reintenta una sola vez. Si no se puede
  // renovar, cierra la sesión y devuelve la respuesta 401.
  function fetchPB(url, options) {
    options = options || {};

    function conToken(tok) {
      var h = Object.assign({}, options.headers || {});
      if (tok) h.Authorization = 'Bearer ' + tok;
      return fetch(url, Object.assign({}, options, { headers: h }));
    }

    var actual = crudo();
    return conToken(actual && actual.token).then(function (res) {
      if (res.status !== 401) return res;
      // token rechazado: intenta renovar y reintentar
      return renovar().then(function (ok) {
        if (!ok) {
          cerrar();
          return res;
        }
        var nuevo = crudo();
        return conToken(nuevo && nuevo.token).then(function (res2) {
          if (res2.status === 401) cerrar();
          return res2;
        });
      });
    });
  }

  // --- guardia de página ------------------------------------------------------

  // Si no hay sesión válida, vuelve al login. Si el token está por vencer,
  // lo renueva en segundo plano para extender la sesión.
  function exigir() {
    var s = crudo();
    if (!s || !s.token || !tokenVigente(s.token)) {
      localStorage.removeItem(CLAVE);
      location.replace('/index.html');
      return false;
    }
    if (porVencer(s.token)) renovar();
    return true;
  }

  window.PBSesion = {
    CLAVE: CLAVE,
    PB: PB,
    leer: leer,
    crudo: crudo,
    user: user,
    id: id,
    headers: headers,
    guardar: guardar,
    renovar: renovar,
    fetch: fetchPB,
    cerrar: cerrar,
    exigir: exigir,
    tokenVigente: tokenVigente,
    porVencer: porVencer
  };
})();
