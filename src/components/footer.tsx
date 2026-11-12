import { site } from '@/content/site';
export function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><div className="footer-heading"><p className="eyebrow">{site.footer.eyebrow}</p><h2>{site.footer.title}</h2></div><ul className="palette">{site.footer.colors.map(color => <li key={color.hex}><span className="swatch" style={{ backgroundColor: color.hex }} /><span>{color.name}</span><span className="color-hex">{color.hex}</span></li>)}</ul></div></footer>;
}
