# Genera la tarjeta de Brote con QR (https://brotes.vercel.app):
#   - tarjeta-brote.svg      → la tarjeta en vectorial (85.6 × 54 mm)
#   - tarjetas-imprimir.html → hoja A4 con 10 tarjetas, lista para imprimir y recortar
#
# Uso:  python generar_tarjeta.py   (necesita `pip install segno`)
import os
import segno

URL = "https://brotes.vercel.app"

# Paleta de Brote (theme.css)
CREMA = "#fffdf8"
PAPEL = "#efe2d0"
ESPRESSO = "#2e1a0f"
TINTA_SUAVE = "#5a4030"
LINEA = "#c4a884"
CORAL = "#e0563b"
ROSA = "#e86a86"
SALVIA = "#4fa07d"

W, H = 856, 540  # 85.6 × 54 mm (tarjeta estándar), 10 unidades = 1 mm


def qr_path(qr, size, x0, y0):
    """Todos los módulos oscuros del QR como un único <path> SVG."""
    matrix = list(qr.matrix)
    n = len(matrix)
    s = size / n
    parts = []
    for r, fila in enumerate(matrix):
        for c, oscuro in enumerate(fila):
            if oscuro:
                parts.append(f"M{x0 + c * s:.2f} {y0 + r * s:.2f}h{s:.2f}v{s:.2f}h-{s:.2f}z")
    return "".join(parts)


def tarjeta_svg():
    qr = segno.make(URL, error="m")

    # Panel blanco del QR (derecha) y área del QR dentro
    panel_x, panel_y, panel_w = 508, 78, 300
    qr_size = 252
    qr_x = panel_x + (panel_w - qr_size) / 2
    qr_y = panel_y + (panel_w - qr_size) / 2
    path = qr_path(qr, qr_size, qr_x, qr_y)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Georgia, 'Times New Roman', serif">
  <defs>
    <linearGradient id="acento" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{ROSA}"/>
      <stop offset="0.55" stop-color="{CORAL}"/>
      <stop offset="1" stop-color="#e89b3c"/>
    </linearGradient>
    <clipPath id="carta"><rect x="3" y="3" width="{W - 6}" height="{H - 6}" rx="26"/></clipPath>
  </defs>

  <!-- fondo de la tarjeta -->
  <rect x="3" y="3" width="{W - 6}" height="{H - 6}" rx="26" fill="{CREMA}" stroke="{LINEA}" stroke-width="3"/>
  <g clip-path="url(#carta)">
    <rect x="3" y="3" width="14" height="{H - 6}" fill="url(#acento)"/>
  </g>

  <!-- brote: tallo, hojas y tierra -->
  <g>
    <path d="M112 208 C112 184 112 166 112 142" fill="none" stroke="#387a5e" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="78" cy="158" rx="34" ry="17" fill="{SALVIA}" transform="rotate(-33 78 158)"/>
    <ellipse cx="146" cy="146" rx="34" ry="17" fill="{SALVIA}" transform="rotate(33 146 146)"/>
    <path d="M76 222 H148" stroke="{CORAL}" stroke-width="11" stroke-linecap="round"/>
  </g>

  <!-- textos -->
  <text x="190" y="208" font-size="104" font-weight="bold" fill="{ESPRESSO}" letter-spacing="-2">Brote</text>
  <text x="72" y="290" font-size="25" font-weight="bold" fill="{CORAL}" letter-spacing="5" font-family="Verdana, Arial, sans-serif">RED SOCIAL DE FOCO</text>

  <text x="72" y="334" font-size="24" fill="{TINTA_SUAVE}" font-style="italic">Enfócate en compañía:</text>
  <text x="72" y="366" font-size="24" fill="{TINTA_SUAVE}" font-style="italic">tu cuenta atrás, tus amigos</text>
  <text x="72" y="398" font-size="24" fill="{TINTA_SUAVE}" font-style="italic">y tu jardín de foco.</text>

  <!-- píldora con la URL -->
  <rect x="72" y="428" width="356" height="56" rx="28" fill="{ESPRESSO}"/>
  <text x="250" y="465" font-size="28" font-weight="bold" fill="{CREMA}" text-anchor="middle" font-family="Verdana, Arial, sans-serif">brotes.vercel.app</text>

  <!-- panel del QR -->
  <rect x="{panel_x}" y="{panel_y}" width="{panel_w}" height="{panel_w}" rx="20" fill="#ffffff" stroke="{LINEA}" stroke-width="3"/>
  <path d="{path}" fill="{ESPRESSO}"/>
  <text x="{panel_x + panel_w / 2}" y="{panel_y + panel_w + 52}" font-size="26" font-weight="bold" fill="{CORAL}" text-anchor="middle" font-family="Verdana, Arial, sans-serif">Escanéame y pruébala</text>
</svg>'''


def hoja_imprimir(svg):
    # A4 vertical: 2 columnas × 5 filas de tarjetas de 85.6 × 54 mm
    tarjeta = f'<div class="tarjeta">{svg}</div>'
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Brote — tarjetas para imprimir</title>
<style>
  @page {{ size: A4 portrait; margin: 8mm; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: system-ui, sans-serif; background: #eee; }}
  .hoja {{
    width: 194mm; margin: 0 auto; padding: 4mm 0;
    display: grid; grid-template-columns: repeat(2, 85.6mm);
    gap: 3mm; justify-content: center; background: white;
  }}
  .tarjeta {{ width: 85.6mm; height: 54mm; outline: 0.2mm dashed #bbb; }}
  .tarjeta svg {{ width: 100%; height: 100%; display: block; }}
  .aviso {{ text-align: center; padding: 10px; color: #555; font-size: 14px; }}
  @media print {{ .aviso {{ display: none; }} body {{ background: white; }} }}
</style>
</head>
<body>
<p class="aviso">Imprime esta página (Ctrl+P) a tamaño real (escala 100%) y recorta por la línea discontinua. 10 tarjetas por hoja.</p>
<div class="hoja">
{tarjeta * 10}
</div>
</body>
</html>'''


if __name__ == "__main__":
    aqui = os.path.dirname(os.path.abspath(__file__))
    svg = tarjeta_svg()
    with open(os.path.join(aqui, "tarjeta-brote.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    with open(os.path.join(aqui, "tarjetas-imprimir.html"), "w", encoding="utf-8") as f:
        f.write(hoja_imprimir(svg))
    print("OK: tarjeta-brote.svg y tarjetas-imprimir.html generados")
