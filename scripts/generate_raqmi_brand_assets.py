from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "brand" / "raqmi-system"
PNG = BRAND / "png"
ICONS = BRAND / "icons"
DIGITAL = BRAND / "digital"
STATIONERY = BRAND / "stationery"

NAVY = "#073B78"
BLUE = "#145CAB"
TEAL = "#0AA3AD"
INK = "#071525"
CLOUD = "#F4F7FA"
MIST = "#DDE7EF"
WHITE = "#FFFFFF"
GRAY = "#5B6775"

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def contain(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, w, h = box
    item = contain(image, w, h)
    px = x + (w - item.width) // 2
    py = y + (h - item.height) // 2
    canvas.alpha_composite(item, (px, py))


def save_jpg(image: Image.Image, path: Path, quality: int = 95) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "JPEG", quality=quality, subsampling=0)


def build_assets() -> None:
    DIGITAL.mkdir(parents=True, exist_ok=True)
    STATIONERY.mkdir(parents=True, exist_ok=True)

    logo_white = Image.open(PNG / "logo-horizontal-white-3072.png").convert("RGBA")
    logo_color = Image.open(PNG / "logo-horizontal-color-3072.png").convert("RGBA")
    logo_bilingual = Image.open(PNG / "logo-bilingual-color-1536.png").convert("RGBA")
    app_dark = Image.open(ICONS / "app-icon-dark-1024.png").convert("RGBA")

    # Desktop application splash screen.
    splash = Image.new("RGBA", (1920, 1080), INK)
    draw = ImageDraw.Draw(splash)
    draw.polygon([(1450, 0), (1920, 0), (1920, 1080), (1100, 1080)], fill="#092444")
    draw.polygon([(1630, 0), (1920, 0), (1920, 720)], fill=TEAL)
    draw.polygon([(1780, 690), (1920, 540), (1920, 1080), (1390, 1080)], fill=BLUE)
    logo = contain(logo_white, 1250, 410)
    splash.alpha_composite(logo, (125, 255))
    draw.text((210, 770), "UN SYSTÈME. TOUTE VOTRE ENTREPRISE.", font=font(42, True), fill=WHITE)
    draw.line((210, 840, 670, 840), fill=TEAL, width=8)
    draw.text((210, 875), "ERP hôtelier et de gestion intégrée", font=font(28), fill="#B8C8D8")
    save_jpg(splash, DIGITAL / "splash-screen-dark-1920x1080.jpg")

    # Presentation cover.
    cover = Image.new("RGBA", (1920, 1080), WHITE)
    draw = ImageDraw.Draw(cover)
    draw.rectangle((0, 0, 610, 1080), fill=INK)
    draw.polygon([(0, 690), (610, 440), (610, 1080), (0, 1080)], fill=NAVY)
    draw.polygon([(0, 830), (610, 580), (610, 860), (0, 1080)], fill=TEAL)
    icon = contain(app_dark, 330, 330)
    cover.alpha_composite(icon, (140, 170))
    draw.text((760, 300), "RAQMI SYSTEM", font=font(76, True), fill=NAVY)
    draw.text((760, 415), "Titre de la présentation", font=font(52, True), fill=INK)
    draw.text((760, 505), "Sous-titre ou contexte du document", font=font(28), fill=GRAY)
    draw.rectangle((760, 585, 1050, 596), fill=TEAL)
    draw.text((760, 860), "Date  |  Direction  |  Confidentiel", font=font(22), fill=GRAY)
    save_jpg(cover, DIGITAL / "presentation-cover-1920x1080.jpg")

    # LinkedIn/social cover.
    social = Image.new("RGBA", (1584, 396), INK)
    draw = ImageDraw.Draw(social)
    draw.polygon([(1180, 0), (1584, 0), (1584, 396), (980, 396)], fill=NAVY)
    draw.polygon([(1390, 0), (1584, 0), (1584, 250)], fill=TEAL)
    logo = contain(logo_white, 860, 270)
    social.alpha_composite(logo, (65, 65))
    draw.text((1040, 260), "ERP INTÉGRÉ", font=font(31, True), fill=WHITE)
    save_jpg(social, DIGITAL / "social-cover-1584x396.jpg")

    # Social profile image.
    avatar = Image.new("RGBA", (1080, 1080), INK)
    icon = contain(app_dark, 900, 900)
    avatar.alpha_composite(icon, ((1080 - icon.width) // 2, (1080 - icon.height) // 2))
    save_jpg(avatar, DIGITAL / "social-avatar-1080x1080.jpg")

    # Email signature template.
    signature = Image.new("RGBA", (1200, 320), WHITE)
    draw = ImageDraw.Draw(signature)
    logo = contain(logo_color, 430, 185)
    signature.alpha_composite(logo, (35, 62))
    draw.rectangle((500, 45, 507, 275), fill=TEAL)
    draw.text((550, 48), "NOM PRÉNOM", font=font(32, True), fill=NAVY)
    draw.text((550, 95), "Fonction / Direction", font=font(22, True), fill=INK)
    draw.text((550, 145), "+213 (0) 000 00 00 00", font=font(20), fill=GRAY)
    draw.text((550, 181), "contact@votre-domaine.dz", font=font(20), fill=GRAY)
    draw.text((550, 217), "Alger, Algérie", font=font(20), fill=GRAY)
    draw.rectangle((550, 260, 900, 266), fill=BLUE)
    signature.save(DIGITAL / "email-signature-template.png")

    # Business card - front.
    card_front = Image.new("RGBA", (1050, 600), INK)
    draw = ImageDraw.Draw(card_front)
    draw.polygon([(720, 0), (1050, 0), (1050, 600), (565, 600)], fill=NAVY)
    draw.polygon([(920, 0), (1050, 0), (1050, 265)], fill=TEAL)
    logo = contain(logo_white, 700, 260)
    card_front.alpha_composite(logo, (70, 135))
    draw.text((82, 470), "UN SYSTÈME. TOUTE VOTRE ENTREPRISE.", font=font(22, True), fill=WHITE)
    save_jpg(card_front, STATIONERY / "business-card-front.jpg")

    # Business card - back.
    card_back = Image.new("RGBA", (1050, 600), WHITE)
    draw = ImageDraw.Draw(card_back)
    draw.rectangle((0, 0, 26, 600), fill=TEAL)
    draw.text((90, 100), "NOM PRÉNOM", font=font(44, True), fill=NAVY)
    draw.text((90, 165), "Fonction / Direction", font=font(25, True), fill=INK)
    draw.rectangle((90, 230, 440, 239), fill=TEAL)
    draw.text((90, 285), "+213 (0) 000 00 00 00", font=font(23), fill=GRAY)
    draw.text((90, 332), "contact@votre-domaine.dz", font=font(23), fill=GRAY)
    draw.text((90, 379), "Alger, Algérie", font=font(23), fill=GRAY)
    icon = contain(app_dark, 250, 250)
    card_back.alpha_composite(icon, (735, 175))
    save_jpg(card_back, STATIONERY / "business-card-back.jpg")

    # A4 letterhead template at 300 dpi.
    letterhead = Image.new("RGBA", (2480, 3508), WHITE)
    draw = ImageDraw.Draw(letterhead)
    logo = contain(logo_color, 930, 300)
    letterhead.alpha_composite(logo, (165, 110))
    draw.rectangle((165, 430, 2315, 442), fill=TEAL)
    draw.text((165, 620), "DESTINATAIRE", font=font(36, True), fill=NAVY)
    draw.text((165, 690), "Objet : Intitulé de la correspondance", font=font(34, True), fill=INK)
    draw.text((165, 810), "Madame, Monsieur,", font=font(30), fill=INK)
    body = (
        "Ce modèle définit la présentation institutionnelle des courriers Raqmi System. "
        "Le corps du document utilise une typographie sobre, un interligne généreux et "
        "une hiérarchie claire afin de garantir une lecture professionnelle."
    )
    words = body.split()
    lines, current = [], ""
    for word in words:
        candidate = (current + " " + word).strip()
        if draw.textlength(candidate, font=font(30)) > 2060:
            lines.append(current)
            current = word
        else:
            current = candidate
    lines.append(current)
    y = 900
    for line in lines:
        draw.text((165, y), line, font=font(30), fill="#283746")
        y += 58
    draw.rectangle((0, 3310, 2480, 3508), fill=INK)
    draw.rectangle((0, 3310, 480, 3328), fill=TEAL)
    draw.text((165, 3372), "RAQMI SYSTEM  |  Alger, Algérie", font=font(25, True), fill=WHITE)
    draw.text((1450, 3372), "contact@votre-domaine.dz", font=font(25), fill="#C2D0DD")
    save_jpg(letterhead, STATIONERY / "letterhead-a4-template.jpg", quality=94)

    # Invoice / report header.
    header = Image.new("RGBA", (1600, 330), WHITE)
    draw = ImageDraw.Draw(header)
    logo = contain(logo_bilingual, 650, 250)
    header.alpha_composite(logo, (40, 30))
    draw.rectangle((0, 315, 1600, 330), fill=NAVY)
    draw.rectangle((0, 315, 520, 330), fill=TEAL)
    draw.text((1100, 92), "DOCUMENT", font=font(34, True), fill=NAVY)
    draw.text((1100, 145), "Référence : RS-0000", font=font(21), fill=GRAY)
    draw.text((1100, 185), "Date : JJ/MM/AAAA", font=font(21), fill=GRAY)
    header.save(STATIONERY / "document-header-template.png")


if __name__ == "__main__":
    build_assets()
