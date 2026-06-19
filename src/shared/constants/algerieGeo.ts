/**
 * Référentiel géographique Algérie — 58 wilayas (découpage 2019, officialisé 2021)
 * et communes officielles par wilaya.
 * Sources : décret 84-79, décret 21-117, loi 19-12, ONS / Wikipedia (communes).
 */

export const WILAYAS_ALGERIE = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj',
  'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela',
  'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal',
  'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet',
  'El M\'Ghair', 'El Meniaa',
] as const;

export type WilayaAlgerie = (typeof WILAYAS_ALGERIE)[number];

/** 57 communes officielles de la wilaya d'Alger (ONS / annuaire wilaya) */
const COMMUNES_ALGER: readonly string[] = [
  'Aïn Benian', 'Aïn Taya', 'Alger-Centre', 'Baba Hassen', 'Bab El Oued', 'Bab Ezzouar',
  'Bachdjerrah', 'Baraki', 'Belouizdad', 'Ben Aknoun', 'Beni Messous', 'Birkhadem',
  'Bir Mourad Raïs', 'Birtouta', 'Bologhine', 'Bordj El Bahri', 'Bordj El Kiffan',
  'Bouzareah', 'Bourouba', 'Casbah', 'Cheraga', 'Dar El Beïda', 'Dely Ibrahim',
  'Djasr Kasentina', 'Douera', 'Draria', 'El Achour', 'El Biar', 'El Harrach',
  'El Madania', 'El Magharia', 'El Marsa', 'El Mouradia', 'H\'Raoua', 'Hammamet',
  'Hydra', 'Hussein Dey', 'Khraicia', 'Kouba', 'Les Eucalyptus', 'Mahelma',
  'Mohammadia', 'Oued Koriche', 'Oued Smar', 'Ouled Chebel', 'Ouled Fayet',
  'Raïs Hamidou', 'Reghaïa', 'Rahmania', 'Rouïba', 'Saoula', 'Sidi M\'Hamed',
  'Sidi Moussa', 'Souidania', 'Staoueli', 'Tessala El Merdja', 'Zeralda',
];

/** Anciennes graphies ou fautes fréquentes → nom officiel */
export const COMMUNE_ALIASES: Record<string, string> = {
  'Ain Benian': 'Aïn Benian',
  'Ain Taya': 'Aïn Taya',
  'Dar El Beida': 'Dar El Beïda',
  'Douira': 'Douera',
  'Hamma Annassers': 'Hussein Dey',
  'Hamma Annasser': 'Hussein Dey',
  'Herraouche': 'H\'Raoua',
  'Hraoua': 'H\'Raoua',
  'Khraissia': 'Khraicia',
  'Mohamed Belouizdad': 'Belouizdad',
  'Reghaia': 'Reghaïa',
  'Rouiba': 'Rouïba',
  'Saoulo': 'Saoula',
  'Souidani Boudjemaa': 'Souidania',
  'Gué de Constantine': 'Djasr Kasentina',
  'Cherchar': 'Chechar',
  'Khezaras': 'Khezara',
  'M\'Rara': 'Merara',
  'Tendla': 'Tendla',
  'Lioua': 'Sidi Khaled',
  'Ras El Miad': 'Ras El Miaad',
  'Ech Chaiba': 'Ech Chaïba',
  'Chaiba': 'Ech Chaïba',
  'Inzghmir': 'In Zghmir',
  'Tamekten': 'Tamokten',
};

/** Communes par wilaya (liste complète pour petites wilayas, principales communes pour les autres) */
export const COMMUNES_PAR_WILAYA: Record<WilayaAlgerie, readonly string[]> = {
  Adrar: [
    'Adrar', 'Akabli', 'Aoulef', 'Bouda', 'Fenoughil', 'In Zghmir', 'Ouled Ahmed Tammi',
    'Reggane', 'Sali', 'Sebaa', 'Tamantit', 'Tamokten', 'Tamest', 'Tit', 'Tsabit', 'Zaouiet Kounta',
  ],
  Chlef: ['Chlef', 'Ténès', 'Oued Fodda', 'El Karimia', 'Boukadir', 'Zeboudja', 'Oued Sly'],
  Laghouat: ['Laghouat', 'Aflou', 'Hassi R\'Mel', 'Brida', 'El Ghicha', 'Kheneg'],
  'Oum El Bouaghi': ['Oum El Bouaghi', 'Aïn Beida', 'Aïn M\'Lila', 'Meskiana', 'F\'Kirina', 'Aïn Fakroun'],
  Batna: ['Batna', 'Barika', 'Merouana', 'Arris', 'N\'Gaous', 'Tazoult', 'Aïn Touta', 'Timgad'],
  Béjaïa: ['Béjaïa', 'Amizour', 'Akbou', 'El Kseur', 'Kherrata', 'Sidi Aïch', 'Tizi N\'Berber', 'Aokas'],
  Biskra: ['Biskra', 'Tolga', 'Sidi Okba', 'Zeribet El Oued', 'El Kantara', 'Ourlal', 'M\'Chouneche', 'M\'Lili'],
  Béchar: ['Béchar', 'Abadla', 'Kenadsa', 'Taghit', 'Beni Ounif', 'Lahmar'],
  Blida: [
    'Blida', 'Boufarik', 'Bougara', 'Chiffa', 'El Affroun', 'Larbaa', 'Meftah', 'Mouzaïa',
    'Oued El Alleug', 'Soumaa', 'Bouinan', 'Bouarfa',
  ],
  Bouira: ['Bouira', 'Lakhdaria', 'Sour El Ghozlane', 'M\'Chedallah', 'Aïn Bessem', 'Haizer', 'El Hachimia'],
  Tamanrasset: ['Tamanrasset', 'Abalessa', 'Idles', 'In Amguel', 'Tazrouk'],
  Tébessa: ['Tébessa', 'Cheria', 'El Aouinet', 'El Kouif', 'Negrine', 'Ouenza', 'El Ogla'],
  Tlemcen: ['Tlemcen', 'Maghnia', 'Ghazaouet', 'Remchi', 'Nedroma', 'Sebdou', 'Hennaya', 'Chetouane'],
  Tiaret: ['Tiaret', 'Frenda', 'Mahdia', 'Sougueur', 'Meghila', 'Aïn Deheb', 'Ksar Chellala'],
  'Tizi Ouzou': [
    'Tizi Ouzou', 'Azazga', 'Boghni', 'Draa El Mizan', 'Larbaâ Nath Irathen', 'Makouda',
    'Ouadhias', 'Tigzirt', 'Aïn El Hammam', 'Mekla',
  ],
  Alger: COMMUNES_ALGER,
  Djelfa: ['Djelfa', 'Aïn Oussera', 'Messaad', 'El Idrissia', 'Hassi Bahbah', 'Birine', 'Charef'],
  Jijel: ['Jijel', 'El Milia', 'Taher', 'Chekfa', 'Settara', 'Texenna', 'Kaous'],
  Sétif: ['Sétif', 'El Eulma', 'Aïn Arnat', 'Aïn Azel', 'Bougaa', 'Beni Ourtilane', 'Guidjel', 'Aïn Oulmene'],
  Saïda: ['Saïda', 'Aïn El Hadjar', 'Youb', 'Hounet', 'Ouled Brahim', 'El Hassasna'],
  Skikda: ['Skikda', 'Collo', 'El Harrouch', 'Azzaba', 'Tamalous', 'Beni Zid', 'Ramadan'],
  'Sidi Bel Abbès': ['Sidi Bel Abbès', 'Telagh', 'Sfisef', 'Aïn El Berd', 'Ras El Ma', 'Tessala', 'Tenira'],
  Annaba: ['Annaba', 'El Bouni', 'El Hadjar', 'Berrahal', 'Seraïdi', 'Aïn Berda', 'Chetaïbi'],
  Guelma: ['Guelma', 'Heliopolis', 'Hammam N\'Bail', 'Oued Zenati', 'Khezara', 'Bouati Mahmoud'],
  Constantine: [
    'Constantine', 'El Khroub', 'Aïn Smara', 'Didouche Mourad', 'Hamma Bouziane', 'Ibn Ziad',
    'Zighoud Youcef', 'Ben Badis',
  ],
  Médéa: ['Médéa', 'Berrouaghia', 'Tablat', 'Ksar El Boukhari', 'Aïn Boucif', 'Ouzera', 'Chahbounia'],
  Mostaganem: ['Mostaganem', 'Aïn Tedeles', 'Hadjadj', 'Sidi Ali', 'Mesra', 'Fornaka', 'Achaacha'],
  'M\'Sila': ['M\'Sila', 'Bou Saada', 'Sidi Aïssa', 'Magra', 'Aïn El Melh', 'Chellal', 'Oultene'],
  Mascara: ['Mascara', 'Sig', 'Ghriss', 'Mohammadia', 'Tighennif', 'Hachem', 'Oued El Abtal'],
  Ouargla: [
    'Ouargla', 'Hassi Messaoud', 'Rouissat', 'Sidi Khouiled', 'N\'Goussa', 'Aïn Beida',
    'El Borma', 'Hassi Ben Abdellah',
  ],
  Oran: [
    'Oran', 'Es Senia', 'Bir El Djir', 'Arzew', 'Bethioua', 'Aïn El Turk', 'Bousfer', 'Gdyel',
    'Mers El Kébir', 'Misserghin',
  ],
  'El Bayadh': ['El Bayadh', 'Brezina', 'Bogtob', 'Rogassa', 'Chellala', 'Stitten'],
  Illizi: ['Illizi', 'In Amenas', 'Debdeb', 'Bordj Omar Driss'],
  'Bordj Bou Arréridj': [
    'Bordj Bou Arréridj', 'Ras El Oued', 'Medjana', 'El Achir', 'Mansoura', 'Hasnaoua', 'Colla',
  ],
  Boumerdès: [
    'Boumerdès', 'Boudouaou', 'Dellys', 'Khemis El Khechna', 'Naciria', 'Isser', 'Baghlia',
    'Thenia', 'Corso', 'Larbatache',
  ],
  'El Tarf': ['El Tarf', 'Ben M\'Hidi', 'Besbes', 'Bouhadjar', 'Dréan', 'El Kala', 'Bougarra'],
  Tindouf: ['Tindouf', 'Oum El Assel'],
  Tissemsilt: ['Tissemsilt', 'Theniet El Had', 'Lardjem', 'Bordj Bounaama', 'Khemisti', 'Lazharia'],
  'El Oued': ['El Oued', 'Debila', 'Djamaa', 'Guemar', 'Reguiba', 'Robbah', 'Magrane', 'Kouinine'],
  Khenchela: [
    'Khenchela', 'Aïn Touila', 'Babar', 'Baghai', 'Bouhmama', 'Chechar', 'El Hamma', 'Kaïs',
    'Ouled Rechache', 'M\'Toussa', 'Remila',
  ],
  'Souk Ahras': ['Souk Ahras', 'Sedrata', 'Taoura', 'Heddada', 'M\'Daourouch', 'Ouled Moumen'],
  Tipaza: [
    'Tipaza', 'Cherchell', 'Koléa', 'Hadjout', 'Damous', 'Fouka', 'Gouraya', 'Sidi Amar',
    'Menaceur', 'Douaouda', 'Bouharoun',
  ],
  Mila: ['Mila', 'Ferdjioua', 'Grarem Gouga', 'Rouached', 'Tadjenanet', 'Teleghma', 'Chelghoum El Aïd'],
  'Aïn Defla': ['Aïn Defla', 'Khemis Miliana', 'Miliana', 'El Attaf', 'Djendel', 'Rouina', 'Boumedfaa'],
  Naâma: ['Naâma', 'Mécheria', 'Aïn Sefra', 'Moghrar', 'Asla', 'El Biodh Sidi Cheikh'],
  'Aïn Témouchent': [
    'Aïn Témouchent', 'Beni Saf', 'El Malah', 'Hammam Bou Hadjar', 'Oulhaça El Gheraba', 'Tamzoura',
  ],
  Ghardaïa: ['Ghardaïa', 'Metlili', 'Berriane', 'El Guerrara', 'Zelfana', 'Bounoura', 'Sebseb'],
  Relizane: ['Relizane', 'Zemmoura', 'Mazouna', 'Yellel', 'Djidiouia', 'Sidi M\'Hamed Ben Ali', 'Mendes'],
  Timimoun: [
    'Timimoun', 'Aougrout', 'Charouine', 'Deldoul', 'Ksar Kaddour', 'Metarfa', 'Ouled Aïssa',
    'Ouled Saïd', 'Talmine', 'Tinerkouk',
  ],
  'Bordj Badji Mokhtar': ['Bordj Badji Mokhtar', 'Timiaouine'],
  'Ouled Djellal': ['Ouled Djellal', 'Doucen', 'Ech Chaïba', 'Besbes', 'Sidi Khaled', 'Ras El Miaad'],
  'Béni Abbès': [
    'Béni Abbès', 'Beni Ikhlef', 'El Ouata', 'Igli', 'Kerzaz', 'Ksabi', 'Ouled Khoudir',
    'Tabelbala', 'Tamtert', 'Timoudi',
  ],
  'In Salah': ['In Salah', 'Foggaret Ezzoua', 'In Ghar'],
  'In Guezzam': ['In Guezzam', 'Tin Zaouatine'],
  Touggourt: [
    'Touggourt', 'Benaceur', 'Blidet Amor', 'El Allia', 'El Hadjira', 'Megarine', 'M\'Naguer',
    'Nezla', 'Sidi Slimane', 'Taibet', 'Temacine', 'Tebesbest', 'Zaouia El Abidia',
  ],
  Djanet: ['Djanet', 'Bordj El Haouas'],
  'El M\'Ghair': [
    'El M\'Ghair', 'Djamaa', 'Merara', 'Oum Touyour', 'Sidi Amrane', 'Sidi Khellil', 'Still', 'Tendla',
  ],
  'El Meniaa': ['El Meniaa', 'Hassi Fehal', 'Hassi Gara'],
};

export function normalizeCommuneName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return COMMUNE_ALIASES[trimmed] ?? trimmed;
}

export function getCommunesForWilaya(wilaya: string): readonly string[] {
  if (!wilaya) return [];
  return COMMUNES_PAR_WILAYA[wilaya as WilayaAlgerie] ?? [];
}

/** Liste des communes incluant une valeur legacy hors référentiel (avec normalisation des alias) */
export function communesForSelect(wilaya: string, currentCommune?: string | null): readonly string[] {
  const base = getCommunesForWilaya(wilaya);
  const raw = currentCommune?.trim();
  if (!raw || !wilaya) return base;

  const normalized = normalizeCommuneName(raw);
  const extras: string[] = [];
  if (!base.includes(normalized as never)) extras.push(normalized);
  if (normalized !== raw && !base.includes(raw as never) && !extras.includes(raw)) extras.push(raw);

  return extras.length ? [...extras, ...base] : base;
}

export function isWilayaAlgerie(value: string): value is WilayaAlgerie {
  return (WILAYAS_ALGERIE as readonly string[]).includes(value);
}
