import type { MetadataRoute } from 'next';

/**
 * PWA instalável (manifest servido em /manifest.webmanifest pelo Next).
 * Sem service worker por enquanto — offline fica para a fase de rede ruim no campo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plantor — contratos de grãos',
    short_name: 'Plantor',
    description: 'Plataforma de contratos de grãos para o agronegócio brasileiro',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f4f2ed',
    theme_color: '#de5b2b',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
