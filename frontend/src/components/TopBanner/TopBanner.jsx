/**
 * TopBanner.jsx — Banner institucional superior.
 *
 * Muestra el logo de la Unión Obrera Metalúrgica (UOM) Sección Avellaneda
 * en la parte superior de todas las páginas del sistema.
 *
 * Se renderiza siempre, independientemente de si el usuario está autenticado o no.
 * Los estilos se cargan desde TopBanner.module.css (CSS Modules).
 */

import styles from './TopBanner.module.css';

export default function TopBanner() {
  return (
    <div className={styles.topBanner}>
      <div className={styles.topBannerInner}>
        {/* Enlace que envuelve el logo institucional */}
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.topBannerLink}
        >
          {/* Logo de la UOM Avellaneda */}
          <img
            src="/logo-uom-avellaneda.png"
            alt="Unión Obrera Metalúrgica — Sección Avellaneda"
            className={styles.topBannerImg}
          />
        </a>
      </div>
    </div>
  );
}
