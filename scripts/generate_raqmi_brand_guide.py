from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand" / "raqmi-system"
OUT = ROOT / "output" / "pdf" / "Charte_Graphique_Raqmi_System.pdf"

W, H = landscape(A4)
NAVY = "#073B78"
BLUE = "#145CAB"
TEAL = "#0AA3AD"
INK = "#071525"
CLOUD = "#F4F7FA"
MIST = "#DDE7EF"
GRAY = "#5B6775"
WHITE = "#FFFFFF"
RED = "#D64545"
GREEN = "#1B9A73"

pdfmetrics.registerFont(TTFont("RaqmiSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("RaqmiSansBold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))


def hex_color(value: str):
    from reportlab.lib.colors import HexColor

    return HexColor(value)


def draw_image_contain(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    rw, rh = iw * scale, ih * scale
    c.drawImage(image, x + (w - rw) / 2, y + (h - rh) / 2, rw, rh, mask="auto")


def text(c: canvas.Canvas, value: str, x: float, y: float, size: float = 12, color: str = INK,
         bold: bool = False, anchor: str = "start") -> None:
    c.setFillColor(hex_color(color))
    c.setFont("RaqmiSansBold" if bold else "RaqmiSans", size)
    if anchor == "middle":
        c.drawCentredString(x, y, value)
    elif anchor == "end":
        c.drawRightString(x, y, value)
    else:
        c.drawString(x, y, value)


def wrapped(c: canvas.Canvas, value: str, x: float, y: float, width: float, size: float = 10,
            leading: float = 15, color: str = GRAY, bold: bool = False, max_lines: int | None = None) -> float:
    c.setFont("RaqmiSansBold" if bold else "RaqmiSans", size)
    words = value.split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if c.stringWidth(candidate) > width and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    if max_lines:
        lines = lines[:max_lines]
    c.setFillColor(hex_color(color))
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_header(c: canvas.Canvas, section: str, title_value: str, page: int, dark: bool = False) -> None:
    if dark:
        c.setFillColor(hex_color(INK))
        c.rect(0, 0, W, H, stroke=0, fill=1)
    else:
        c.setFillColor(hex_color(WHITE))
        c.rect(0, 0, W, H, stroke=0, fill=1)
    text(c, section.upper(), 52, H - 48, 9, TEAL, True)
    text(c, title_value, 52, H - 82, 26, WHITE if dark else INK, True)
    c.setFillColor(hex_color(TEAL))
    c.rect(52, H - 96, 115, 4, stroke=0, fill=1)
    text(c, f"RAQMI SYSTEM  |  CHARTE GRAPHIQUE 1.0", 52, 27, 7.5, "#AFC0D0" if dark else GRAY)
    text(c, f"{page:02d}", W - 52, 27, 8, TEAL, True, "end")


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float, title_value: str, body: str,
         accent: str = TEAL) -> None:
    c.setFillColor(hex_color(CLOUD))
    c.roundRect(x, y, w, h, 10, stroke=0, fill=1)
    c.setFillColor(hex_color(accent))
    c.roundRect(x, y + h - 8, w, 8, 4, stroke=0, fill=1)
    text(c, title_value, x + 18, y + h - 36, 13, NAVY, True)
    wrapped(c, body, x + 18, y + h - 58, w - 36, 9.2, 14, GRAY)


def create_pdf() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H))
    c.setTitle("Charte graphique Raqmi System")
    c.setAuthor("Raqmi System")

    # 1 - Cover.
    c.setFillColor(hex_color(INK))
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(hex_color(NAVY))
    c.rect(W * 0.66, 0, W * 0.34, H, stroke=0, fill=1)
    c.setFillColor(hex_color(TEAL))
    c.setFillColor(hex_color(TEAL))
    c.wedge(W - 255, H - 255, W + 105, H + 105, 180, 90, stroke=0, fill=1)
    draw_image_contain(c, BRAND / "png" / "logo-horizontal-white-3072.png", 70, 205, 590, 210)
    text(c, "IDENTITÉ VISUELLE ET CHARTE GRAPHIQUE", 86, 156, 17, WHITE, True)
    text(c, "Un système. Toute votre entreprise.", 86, 122, 12.5, "#C3D0DD")
    c.setFillColor(hex_color(TEAL))
    c.rect(86, 96, 220, 5, stroke=0, fill=1)
    text(c, "VERSION 1.0  |  AOÛT 2026", 86, 62, 9, "#9BB0C2", True)
    c.showPage()

    # 2 - Brand platform.
    page_header(c, "01 - Plateforme de marque", "Positionnement et personnalité", 2)
    text(c, "RAQMI SYSTEM", 52, 445, 15, NAVY, True)
    wrapped(c, "Un ERP intégré conçu pour réunir l'exploitation, la finance, les achats, les stocks, le CRM et la décision dans une expérience unique, fiable et bilingue.", 52, 422, 730, 12, 18, GRAY)
    card(c, 52, 225, 170, 150, "PROMESSE", "Centraliser les opérations et transformer les données en décisions claires.", TEAL)
    card(c, 238, 225, 170, 150, "POSITIONNEMENT", "Une plateforme de gestion complète, locale dans son expression et internationale dans son niveau d'exigence.", BLUE)
    card(c, 424, 225, 170, 150, "PERSONNALITÉ", "Précise, solide, moderne, accessible et institutionnelle.", NAVY)
    card(c, 610, 225, 170, 150, "SIGNATURE", "Un système. Toute votre entreprise.", TEAL)
    text(c, "Valeurs", 52, 175, 14, INK, True)
    for index, value in enumerate(["INTÉGRATION", "FIABILITÉ", "CLARTÉ", "PROXIMITÉ", "MAÎTRISE"]):
        x = 52 + index * 145
        c.setFillColor(hex_color(NAVY if index % 2 else TEAL))
        c.circle(x + 7, 137, 7, stroke=0, fill=1)
        text(c, value, x + 22, 133, 9, NAVY, True)
    c.showPage()

    # 3 - Symbol concept.
    page_header(c, "02 - Concept", "Un signe bilingue : Q + qaf", 3)
    draw_image_contain(c, BRAND / "png" / "symbol-color-1024.png", 70, 105, 330, 380)
    text(c, "Q", 448, 442, 42, NAVY, True)
    wrapped(c, "La structure principale conserve la lecture du Q latin, directement liée au nom RAQMI.", 500, 451, 280, 10.5, 16, GRAY)
    text(c, "ق", 448, 342, 42, TEAL, True)
    wrapped(c, "Les deux points identifient le qaf arabe et donnent au symbole son ancrage culturel distinctif.", 500, 351, 280, 10.5, 16, GRAY)
    c.setFillColor(hex_color(BLUE))
    c.roundRect(448, 240, 38, 38, 5, stroke=0, fill=1)
    wrapped(c, "La diagonale traduit le mouvement, le transfert d'information et la décision.", 500, 268, 280, 10.5, 16, GRAY)
    c.setFillColor(hex_color(MIST))
    c.roundRect(448, 115, 332, 84, 10, stroke=0, fill=1)
    text(c, "IDÉE CENTRALE", 466, 171, 9, TEAL, True)
    wrapped(c, "Une technologie universelle avec une identité algérienne assumée.", 466, 149, 295, 11.5, 17, NAVY, True)
    c.showPage()

    # 4 - Logo system.
    page_header(c, "03 - Système de logo", "Versions principales", 4)
    c.setFillColor(hex_color(CLOUD))
    c.roundRect(52, 305, 350, 185, 12, stroke=0, fill=1)
    draw_image_contain(c, BRAND / "png" / "logo-horizontal-color-1536.png", 72, 330, 310, 130)
    text(c, "PRINCIPALE - FOND CLAIR", 70, 319, 8, GRAY, True)
    c.setFillColor(hex_color(INK))
    c.roundRect(430, 305, 350, 185, 12, stroke=0, fill=1)
    draw_image_contain(c, BRAND / "png" / "logo-horizontal-white-1536.png", 450, 330, 310, 130)
    text(c, "INVERSÉE - FOND SOMBRE", 448, 319, 8, "#B7C7D5", True)
    c.setFillColor(hex_color(WHITE))
    c.roundRect(52, 100, 728, 165, 12, stroke=1, fill=1)
    c.setStrokeColor(hex_color(MIST))
    draw_image_contain(c, BRAND / "png" / "logo-bilingual-color-1536.png", 86, 115, 660, 125)
    text(c, "SIGNATURE BILINGUE - SUPPORTS INSTITUTIONNELS", 70, 112, 8, GRAY, True)
    c.showPage()

    # 5 - Clear space.
    page_header(c, "04 - Construction", "Zone de protection et tailles minimales", 5)
    c.setStrokeColor(hex_color(TEAL))
    c.setDash(5, 4)
    c.rect(80, 150, 360, 320, stroke=1, fill=0)
    c.setDash()
    draw_image_contain(c, BRAND / "png" / "symbol-color-1024.png", 125, 185, 270, 250)
    text(c, "x", 66, 307, 18, TEAL, True)
    text(c, "x", 250, 475, 18, TEAL, True)
    text(c, "ZONE LIBRE = HAUTEUR D'UN POINT", 80, 126, 9, GRAY, True)
    card(c, 480, 330, 300, 140, "TAILLE MINIMALE - PRINT", "Signature horizontale : 35 mm. Symbole seul : 12 mm. En dessous, utiliser le symbole simplifié monochrome.", TEAL)
    card(c, 480, 165, 300, 140, "TAILLE MINIMALE - ÉCRAN", "Signature horizontale : 180 px. Symbole seul : 24 px. Icône d'application : fichiers dédiés 16 à 1024 px.", BLUE)
    wrapped(c, "Toujours préserver le contraste, les deux points et la diagonale du Q.", 480, 125, 300, 10.5, 15, NAVY, True)
    c.showPage()

    # 6 - Colors.
    page_header(c, "05 - Couleurs", "Palette principale et fonctionnelle", 6)
    swatches = [
        ("RAQMI NAVY", NAVY, "#073B78", "RGB 7 59 120", "CMJN 94 51 0 53"),
        ("DIGITAL BLUE", BLUE, "#145CAB", "RGB 20 92 171", "CMJN 88 46 0 33"),
        ("QAF TEAL", TEAL, "#0AA3AD", "RGB 10 163 173", "CMJN 94 6 0 32"),
        ("SYSTEM INK", INK, "#071525", "RGB 7 21 37", "CMJN 81 43 0 85"),
        ("CLOUD", CLOUD, "#F4F7FA", "RGB 244 247 250", "CMJN 2 1 0 2"),
    ]
    for index, (name, value, hexa, rgb, cmyk) in enumerate(swatches):
        x = 52 + index * 148
        c.setFillColor(hex_color(value))
        c.roundRect(x, 240, 128, 220, 10, stroke=0, fill=1)
        info_color = WHITE if index < 4 else INK
        text(c, name, x + 12, 290, 9, info_color, True)
        text(c, hexa, x + 12, 270, 9, info_color, True)
        text(c, rgb, x + 12, 254, 7.2, info_color)
        text(c, cmyk, x + 12, 242, 6.6, info_color)
    text(c, "RÉPARTITION RECOMMANDÉE", 52, 188, 10, NAVY, True)
    c.setFillColor(hex_color(WHITE)); c.roundRect(52, 135, 520, 34, 5, stroke=1, fill=1)
    c.setFillColor(hex_color(NAVY)); c.rect(52, 135, 208, 34, stroke=0, fill=1)
    c.setFillColor(hex_color(TEAL)); c.rect(260, 135, 78, 34, stroke=0, fill=1)
    c.setFillColor(hex_color(BLUE)); c.rect(338, 135, 52, 34, stroke=0, fill=1)
    c.setFillColor(hex_color(CLOUD)); c.rect(390, 135, 182, 34, stroke=0, fill=1)
    text(c, "40 % NAVY", 52, 111, 8, NAVY, True)
    text(c, "15 % TEAL", 205, 111, 8, TEAL, True)
    text(c, "10 % BLUE", 330, 111, 8, BLUE, True)
    text(c, "35 % NEUTRES", 455, 111, 8, GRAY, True)
    c.showPage()

    # 7 - Typography.
    page_header(c, "06 - Typographie", "Système latin et arabe", 7)
    text(c, "RAQMI", 52, 420, 62, NAVY, True)
    text(c, "LOGOTYPE PERSONNALISÉ", 55, 390, 9, TEAL, True)
    text(c, "Manrope", 52, 300, 36, INK, True)
    text(c, "Titres, interface et chiffres", 52, 274, 10, GRAY)
    text(c, "Aa Bb Cc 0123456789", 52, 232, 22, NAVY)
    text(c, "IBM Plex Sans Arabic", 430, 310, 18, INK, True)
    text(c, "/ Noto Kufi Arabic", 430, 284, 18, INK, True)
    text(c, "Interface et communication en arabe", 430, 258, 10, GRAY)
    draw_image_contain(c, BRAND / "png" / "logo-bilingual-color-1536.png", 430, 165, 330, 82)
    c.setFillColor(hex_color(CLOUD))
    c.roundRect(52, 90, 728, 70, 10, stroke=0, fill=1)
    text(c, "RÈGLE", 70, 135, 9, TEAL, True)
    wrapped(c, "Le logotype ne doit jamais être recomposé avec une police. Pour l'interface, utiliser Manrope en latin et IBM Plex Sans Arabic ou Noto Kufi Arabic en arabe.", 130, 136, 625, 9.5, 14, GRAY)
    c.showPage()

    # 8 - UI system.
    page_header(c, "07 - Produit numérique", "Principes UI pour l'ERP", 8)
    c.setFillColor(hex_color(CLOUD)); c.roundRect(52, 125, 728, 340, 14, stroke=0, fill=1)
    text(c, "TABLEAU DE BORD", 78, 425, 12, NAVY, True)
    text(c, "Vue consolidée de l'exploitation", 78, 403, 8.5, GRAY)
    for index, (label, value, color) in enumerate([
        ("Chiffre d'affaires", "12,8 M DA", NAVY),
        ("Occupation", "78,4 %", TEAL),
        ("Encaissements", "9,2 M DA", BLUE),
    ]):
        x = 78 + index * 215
        c.setFillColor(hex_color(WHITE)); c.roundRect(x, 295, 195, 88, 8, stroke=0, fill=1)
        text(c, label, x + 14, 357, 8, GRAY)
        text(c, value, x + 14, 321, 20, color, True)
    c.setFillColor(hex_color(WHITE)); c.roundRect(78, 155, 410, 115, 8, stroke=0, fill=1)
    c.setFillColor(hex_color(TEAL)); c.roundRect(98, 180, 130, 38, 6, stroke=0, fill=1)
    text(c, "ACTION", 163, 194, 9, WHITE, True, "middle")
    c.setFillColor(hex_color(WHITE)); c.setStrokeColor(hex_color(NAVY)); c.roundRect(244, 180, 130, 38, 6, stroke=1, fill=1)
    text(c, "SECONDAIRE", 309, 194, 8, NAVY, True, "middle")
    c.setFillColor(hex_color(GREEN)); c.circle(535, 220, 7, stroke=0, fill=1); text(c, "Succès", 550, 216, 8, GRAY)
    c.setFillColor(hex_color(RED)); c.circle(535, 185, 7, stroke=0, fill=1); text(c, "Alerte", 550, 181, 8, GRAY)
    text(c, "Rayon : 8 px  |  Grille : 8 px  |  Contraste AA minimum", 78, 137, 8, GRAY, True)
    c.showPage()

    # 9 - Icons.
    page_header(c, "08 - Icônes", "Application, favicon et raccourcis", 9)
    draw_image_contain(c, BRAND / "icons" / "app-icon-dark-1024.png", 52, 185, 270, 270)
    draw_image_contain(c, BRAND / "icons" / "app-icon-light-1024.png", 355, 185, 270, 270)
    draw_image_contain(c, BRAND / "icons" / "app-icon-dark-128.png", 660, 340, 92, 92)
    draw_image_contain(c, BRAND / "icons" / "app-icon-dark-64.png", 680, 245, 56, 56)
    draw_image_contain(c, BRAND / "icons" / "app-icon-dark-32.png", 692, 185, 32, 32)
    text(c, "1024 px", 150, 164, 8, GRAY, True)
    text(c, "FOND CLAIR", 440, 164, 8, GRAY, True)
    text(c, "128 / 64 / 32 px", 650, 145, 8, GRAY, True)
    c.setFillColor(hex_color(CLOUD)); c.roundRect(52, 90, 728, 54, 8, stroke=0, fill=1)
    wrapped(c, "Pour Windows, utiliser RaqmiSystem.ico. Ne jamais ajouter de texte dans l'icône, ni supprimer les deux points du qaf.", 70, 121, 690, 9.5, 14, GRAY)
    c.showPage()

    # 10 - Digital applications.
    page_header(c, "09 - Applications", "Supports numériques", 10)
    draw_image_contain(c, BRAND / "digital" / "splash-screen-dark-1920x1080.jpg", 52, 285, 350, 195)
    draw_image_contain(c, BRAND / "digital" / "presentation-cover-1920x1080.jpg", 430, 285, 350, 195)
    draw_image_contain(c, BRAND / "digital" / "social-cover-1584x396.jpg", 52, 125, 350, 125)
    draw_image_contain(c, BRAND / "digital" / "email-signature-template.png", 430, 125, 350, 125)
    text(c, "ÉCRAN DE DÉMARRAGE", 52, 270, 8, GRAY, True)
    text(c, "PRÉSENTATION", 430, 270, 8, GRAY, True)
    text(c, "COUVERTURE SOCIALE", 52, 108, 8, GRAY, True)
    text(c, "SIGNATURE E-MAIL", 430, 108, 8, GRAY, True)
    c.showPage()

    # 11 - Stationery.
    page_header(c, "10 - Papeterie", "Correspondance et documents", 11)
    draw_image_contain(c, BRAND / "stationery" / "business-card-front.jpg", 52, 305, 350, 200)
    draw_image_contain(c, BRAND / "stationery" / "business-card-back.jpg", 430, 305, 350, 200)
    draw_image_contain(c, BRAND / "stationery" / "letterhead-a4-template.jpg", 80, 90, 230, 190)
    draw_image_contain(c, BRAND / "stationery" / "document-header-template.png", 350, 125, 430, 115)
    text(c, "CARTE - RECTO", 52, 286, 8, GRAY, True)
    text(c, "CARTE - VERSO", 430, 286, 8, GRAY, True)
    text(c, "PAPIER À EN-TÊTE A4", 80, 78, 8, GRAY, True)
    text(c, "EN-TÊTE RAPPORT / FACTURE", 350, 108, 8, GRAY, True)
    c.showPage()

    # 12 - Rules.
    page_header(c, "11 - Gouvernance", "Bon usage et fichiers maîtres", 12)
    text(c, "À FAIRE", 52, 455, 13, GREEN, True)
    text(c, "À ÉVITER", 430, 455, 13, RED, True)
    good = [
        "Utiliser les fichiers SVG pour l'impression.",
        "Respecter la zone de protection.",
        "Choisir la version adaptée au fond.",
        "Conserver les couleurs officielles.",
    ]
    bad = [
        "Déformer, incliner ou étirer le logo.",
        "Ajouter ombre, contour ou dégradé.",
        "Déplacer les deux points du qaf.",
        "Recomposer RAQMI avec une autre police.",
    ]
    for index, item in enumerate(good):
        y = 415 - index * 52
        c.setFillColor(hex_color(GREEN)); c.circle(62, y + 3, 5, stroke=0, fill=1)
        wrapped(c, item, 78, y, 305, 9.5, 14, GRAY)
    for index, item in enumerate(bad):
        y = 415 - index * 52
        c.setStrokeColor(hex_color(RED)); c.line(428, y - 2, 440, y + 10); c.line(440, y - 2, 428, y + 10)
        wrapped(c, item, 452, y, 305, 9.5, 14, GRAY)
    c.setFillColor(hex_color(INK)); c.roundRect(52, 105, 728, 90, 10, stroke=0, fill=1)
    text(c, "PACK MAÎTRE", 72, 164, 10, TEAL, True)
    wrapped(c, "assets/brand/raqmi-system : SVG, PNG, JPG, ICO, papeterie, supports numériques et charte graphique. Toute nouvelle déclinaison doit partir de ces fichiers.", 72, 143, 680, 9.5, 14, WHITE)
    c.save()


if __name__ == "__main__":
    create_pdf()
