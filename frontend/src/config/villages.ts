export interface VillageConfig {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  taluka: string;
  lat: number;
  lng: number;
}

export const VILLAGES: VillageConfig[] = [
  // Niphad Taluka
  { id: 'niphad_rural', name: 'Niphad', name_mr: 'निफाड', name_hi: 'निफाड़', taluka: 'Niphad', lat: 20.0898, lng: 74.1082 },
  { id: 'lasalgaon_v', name: 'Lasalgaon Village', name_mr: 'लासलगाव गाव', name_hi: 'लासलगांव', taluka: 'Niphad', lat: 20.1472, lng: 74.2262 },
  { id: 'pimpalgaon_v', name: 'Pimpalgaon Rural', name_mr: 'पिंपळगाव ग्रामीण', name_hi: 'पिंपलगांव ग्रामीण', taluka: 'Niphad', lat: 20.1706, lng: 73.9856 },
  { id: 'ozar', name: 'Ozar (HAL)', name_mr: 'ओझर', name_hi: 'ओझर', taluka: 'Niphad', lat: 20.0984, lng: 73.9162 },
  { id: 'saikheda', name: 'Saikheda', name_mr: 'सायखेडा', name_hi: 'सायखेड़ा', taluka: 'Niphad', lat: 20.0612, lng: 74.0289 },
  { id: 'khedgaon', name: 'Khedgaon', name_mr: 'खेडगाव', name_hi: 'खेड़गांव', taluka: 'Dindori', lat: 20.1856, lng: 73.8821 },
  { id: 'sukene', name: 'Mouje Sukene', name_mr: 'मौजे सुकेणे', name_hi: 'मौजे सुकेणे', taluka: 'Niphad', lat: 20.0911, lng: 74.0321 },

  // Dindori Taluka
  { id: 'dindori_v', name: 'Dindori Rural', name_mr: 'दिंडोरी ग्रामीण', name_hi: 'दिंडोरी ग्रामीण', taluka: 'Dindori', lat: 20.2014, lng: 73.8340 },
  { id: 'vani', name: 'Vani (Saptashrungi base)', name_mr: 'वणी', name_hi: 'वणी', taluka: 'Dindori', lat: 20.3278, lng: 73.8967 },
  { id: 'janori', name: 'Janori', name_mr: 'जानोरी', name_hi: 'जानोरी', taluka: 'Dindori', lat: 20.1245, lng: 73.8741 },

  // Sinnar Taluka
  { id: 'sinnar_v', name: 'Sinnar Rural', name_mr: 'सिन्नर ग्रामीण', name_hi: 'सिन्नर ग्रामीण', taluka: 'Sinnar', lat: 19.8510, lng: 73.9930 },
  { id: 'musalgaon', name: 'Musalgaon MIDC', name_mr: 'मुसळगाव', name_hi: 'मुसलगांव', taluka: 'Sinnar', lat: 19.8821, lng: 74.0210 },
  { id: 'dapur', name: 'Dapur', name_mr: 'दापूर', name_hi: 'दापुर', taluka: 'Sinnar', lat: 19.7892, lng: 74.0512 },
  { id: 'pandhurli', name: 'Pandhurli', name_mr: 'पांढुर्ली', name_hi: 'पांढुर्ली', taluka: 'Sinnar', lat: 19.8124, lng: 73.8641 },

  // Yeola Taluka
  { id: 'yeola_v', name: 'Yeola Rural', name_mr: 'येवला ग्रामीण', name_hi: 'येवला ग्रामीण', taluka: 'Yeola', lat: 20.0382, lng: 74.4891 },
  { id: 'andarshul', name: 'Andarsul', name_mr: 'अंदरसूल', name_hi: 'अंदरसूल', taluka: 'Yeola', lat: 19.9821, lng: 74.5821 },
  { id: 'nagarsul', name: 'Nagarsul', name_mr: 'नगरसूल', name_hi: 'नगरसूल', taluka: 'Yeola', lat: 20.0892, lng: 74.4412 },

  // Chandwad Taluka
  { id: 'chandwad_v', name: 'Chandwad Rural', name_mr: 'चांदवड ग्रामीण', name_hi: 'चांदवड़ ग्रामीण', taluka: 'Chandwad', lat: 20.3275, lng: 74.2407 },
  { id: 'vadner_bhairao', name: 'Vadner Bhairao', name_mr: 'वडनेर भैरव', name_hi: 'वडनेर भैरव', taluka: 'Chandwad', lat: 20.2412, lng: 74.1523 },
  { id: 'kundewadi', name: 'Kundewadi', name_mr: 'कुंदेवाडी', name_hi: 'कुंदेवाड़ी', taluka: 'Niphad', lat: 20.1082, lng: 74.1204 },

  // Kalwan & Baglan / Satana
  { id: 'satana_v', name: 'Satana Town', name_mr: 'सटाणा', name_hi: 'सटाणा', taluka: 'Baglan', lat: 20.5912, lng: 74.2045 },
  { id: 'taharabhad', name: 'Taharabhad', name_mr: 'तहराराबाद', name_hi: 'तहाराबाद', taluka: 'Baglan', lat: 20.6512, lng: 74.0214 },
  { id: 'kalwan_v', name: 'Kalwan Rural', name_mr: 'कळवण ग्रामीण', name_hi: 'कलवण ग्रामीण', taluka: 'Kalwan', lat: 20.4905, lng: 73.9972 },
  { id: 'abhona', name: 'Abhona', name_mr: 'आभोणा', name_hi: 'आभोणा', taluka: 'Kalwan', lat: 20.5214, lng: 73.8821 },

  // Malegaon Taluka
  { id: 'malegaon_v', name: 'Malegaon Outskirts', name_mr: 'मालेगाव ग्रामीण', name_hi: 'मालेगांव ग्रामीण', taluka: 'Malegaon', lat: 20.5539, lng: 74.5288 },
  { id: 'zodga', name: 'Zodga', name_mr: 'झोडगे', name_hi: 'झोड़गे', taluka: 'Malegaon', lat: 20.6214, lng: 74.6821 },
  { id: 'sayane', name: 'Sayane', name_mr: 'सयाने', name_hi: 'सयाने', taluka: 'Malegaon', lat: 20.4912, lng: 74.4512 },

  // Nashik Taluka (Peri-urban)
  { id: 'girnare', name: 'Girnare (Tomato Belt)', name_mr: 'गिरणारे (टोमॅटो पट्टा)', name_hi: 'गिरणारे', taluka: 'Nashik', lat: 20.0412, lng: 73.6621 },
  { id: 'makhmalabad', name: 'Makhmalabad', name_mr: 'मखमलाबाद', name_hi: 'मखमलीबाद', taluka: 'Nashik', lat: 20.0521, lng: 73.7821 },
  { id: 'deolali', name: 'Deolali Gaon', name_mr: 'देवळाली गाव', name_hi: 'देवलाली गांव', taluka: 'Nashik', lat: 19.9512, lng: 73.8341 },

  // Igatpuri & Trimbak
  { id: 'ghoti', name: 'Ghoti', name_mr: 'घोटी', name_hi: 'घोटी', taluka: 'Igatpuri', lat: 19.7214, lng: 73.6214 },
  { id: 'trimbak', name: 'Trimbakeshwar Rural', name_mr: 'त्र्यंबकेश्वर ग्रामीण', name_hi: 'त्र्यंबकेश्वर ग्रामीण', taluka: 'Trimbak', lat: 19.9382, lng: 73.5312 },
  { id: 'igatpuri_v', name: 'Igatpuri Town', name_mr: 'इगतपुरी', name_hi: 'इगतपुरी', taluka: 'Igatpuri', lat: 19.7027, lng: 73.5583 },

  // Nandgaon & Manmad
  { id: 'nandgaon_v', name: 'Nandgaon Rural', name_mr: 'नांदगाव ग्रामीण', name_hi: 'नांदगांव ग्रामीण', taluka: 'Nandgaon', lat: 20.3128, lng: 74.6593 },
  { id: 'manmad_v', name: 'Manmad Rural', name_mr: 'मनमाड ग्रामीण', name_hi: 'मनमाड ग्रामीण', taluka: 'Nandgaon', lat: 20.2508, lng: 74.4394 },
  { id: 'naydongri', name: 'Naydongri', name_mr: 'नायडोंगरी', name_hi: 'नायडोंगरी', taluka: 'Nandgaon', lat: 20.4124, lng: 74.7214 },
];
