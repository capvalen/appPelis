// menu-navegacion.js — Web Component reutilizable del menú de navegación
// Uso: <menu-navegacion activo="peliculas|juegos|etiquetas|reportes|config"></menu-navegacion>
// Incluye la entrada "Salir" que cierra la sesión (usa window.PBSesion si está disponible).
// Usa luz DOM (sin shadow root) para heredar los estilos globales de style.css
class MenuNavegacion extends HTMLElement {
  connectedCallback() {
    if (this._montado) return;
    this._montado = true;

    const actual = (this.getAttribute('activo') || '').toLowerCase();
    const enlaces = [
      { href: '/peliculas.html', clave: 'peliculas', icono: 'ti ti-device-tv', texto: 'Películas / Series' },
      { href: '/juegos.html', clave: 'juegos', icono: 'ti ti-device-gamepad', texto: 'Juegos' },
      { href: '/etiquetas.html', clave: 'etiquetas', icono: 'ti ti-tags', texto: 'Etiquetas' },
      { href: '/reportes.html', clave: 'reportes', icono: 'ti ti-chart-bar', texto: 'Reportes' },
      { href: '/config.html', clave: 'config', icono: 'ti ti-settings', texto: 'Configuración' }
    ];

    this.innerHTML =
      '<div class="menu-wrap">' +
        '<button type="button" class="btn-menu" title="Menú"><i class="ti ti-menu-2"></i></button>' +
        '<nav class="menu-panel">' +
          enlaces.map(e =>
            '<a href="' + e.href + '"' + (e.clave === actual ? ' class="activo"' : '') + '>' +
            '<i class="' + e.icono + '"></i> ' + e.texto + '</a>'
          ).join('') +
          '<a href="#" class="menu-salir"><i class="ti ti-logout"></i> Salir</a>' +
        '</nav>' +
      '</div>';

    const btn = this.querySelector('.btn-menu');
    const panel = this.querySelector('.menu-panel');

    // abrir/cerrar con el botón (sin que el clic cierre al instante)
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('abierto');
    });

    // cerrar al hacer clic en un enlace o salir de la sesión
    panel.addEventListener('click', (e) => {
      const salir = e.target.closest('.menu-salir');
      if (salir) {
        e.preventDefault();
        panel.classList.remove('abierto');
        if (window.PBSesion) window.PBSesion.cerrar();
        else location.replace('/index.html');
        return;
      }
      if (e.target.closest('a')) panel.classList.remove('abierto');
    });

    // cerrar al hacer clic fuera del menú
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) panel.classList.remove('abierto');
    });
  }
}

customElements.define('menu-navegacion', MenuNavegacion);

if ('serviceWorker' in navigator) {
  const registrarSW = () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => { if (reg.active) reg.update().catch(() => {}); })
      .catch(() => {});
  };
  if (document.readyState === 'complete') registrarSW();
  else window.addEventListener('load', registrarSW);
}