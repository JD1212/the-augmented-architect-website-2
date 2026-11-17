import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/content/site';

export const alt = `${site.name} — ${site.hero.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function SocialImage() {
  const logo = await readFile(join(process.cwd(), 'public/brand/aa-monogram.svg'));
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: 72, background: '#F5F2EA', color: '#252B31', borderTop: '8px solid #597C9E' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* Satori renders a static SVG data URL; next/image is not used inside generated images. */}
        <img src={`data:image/svg+xml;base64,${logo.toString('base64')}`} alt="" width={142} height={64} />
        <span style={{ fontSize: 28, fontWeight: 600 }}>{site.name}</span>
      </div>
      <div style={{ display: 'flex', fontSize: 82, fontWeight: 700, letterSpacing: -4, lineHeight: 1.1, maxWidth: 900 }}>{site.hero.title}</div>
      <div style={{ display: 'flex', color: '#535B64', fontSize: 24 }}>AI Solutions · Salesforce Modernization · Custom Business Applications</div>
    </div>, size,
  );
}
