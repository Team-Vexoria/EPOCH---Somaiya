export interface FpoClusterConfig {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  taluka: string;
  registeredMembers: number;
  clusterType: string;
  clusterType_mr: string;
  lat: number;
  lng: number;
}

export const FPO_CLUSTERS: FpoClusterConfig[] = [
  {
    id: 'niphad_rural',
    name: 'Niphad Central Packhouse (Sahyadri Cluster)',
    name_mr: 'निफाड मध्यवर्ती पॅकहाऊस (सह्याद्री क्लस्टर)',
    name_hi: 'निफाड़ केंद्रीय पैकहाउस (सह्याद्री क्लस्टर)',
    taluka: 'Niphad',
    registeredMembers: 420,
    clusterType: 'Onion & Soybean Aggregation Hub',
    clusterType_mr: 'कांदा व सोयाबीन संकलन केंद्र',
    lat: 20.0898,
    lng: 74.1082,
  },
  {
    id: 'dindori_v',
    name: 'Dindori Agri Cluster Depot',
    name_mr: 'दिंडोरी कृषी संकलन डेपो (भाजीपाला पट्टा)',
    name_hi: 'दिंडोरी कृषि संकलन डिपो (सब्जी बेल्ट)',
    taluka: 'Dindori',
    registeredMembers: 380,
    clusterType: 'Tomato & Perishable Cold Hub',
    clusterType_mr: 'टोमॅटो व भाजीपाला संकलन केंद्र',
    lat: 20.2014,
    lng: 73.834,
  },
  {
    id: 'kalwan_v',
    name: 'Kalwan Tribal FPO Facility',
    name_mr: 'कळवण शेतकरी उत्पादक केंद्र (आदिवासी पट्टा)',
    name_hi: 'कलवण किसान उत्पादक केंद्र',
    taluka: 'Kalwan',
    registeredMembers: 290,
    clusterType: 'Kharif Onion & Pulses Hub',
    clusterType_mr: 'खरीप कांदा व कडधान्य केंद्र',
    lat: 20.4905,
    lng: 73.9972,
  },
  {
    id: 'sinnar_v',
    name: 'Sinnar South Aggregation Depot',
    name_mr: 'सिन्नर दक्षिण संकलन केंद्र (पांढुर्ली-वावी पट्टा)',
    name_hi: 'सिन्नर दक्षिण संकलन डिपो',
    taluka: 'Sinnar',
    registeredMembers: 310,
    clusterType: 'Soybean & Grain Aggregation Depot',
    clusterType_mr: 'सोयाबीन व धान्य संकलन डेपो',
    lat: 19.851,
    lng: 73.993,
  },
  {
    id: 'yeola_v',
    name: 'Yeola Eastern Farmer Center',
    name_mr: 'येवला पूर्व शेतकरी केंद्र (अंदरसूल-नगरसूल पट्टा)',
    name_hi: 'येवला पूर्वी किसान केंद्र',
    taluka: 'Yeola',
    registeredMembers: 260,
    clusterType: 'Late Kharif Onion Aggregation Hub',
    clusterType_mr: 'रांगडा कांदा संकलन केंद्र',
    lat: 20.0382,
    lng: 74.4891,
  },
  {
    id: 'satana_v',
    name: 'Satana Baglan Valley Packhouse',
    name_mr: 'सटाणा बागलाण व्हॅली पॅकहाऊस',
    name_hi: 'सटाणा बागलाण वैली पैकहाउस',
    taluka: 'Baglan',
    registeredMembers: 350,
    clusterType: 'Export Quality Red Onion Depot',
    clusterType_mr: 'निर्यातक्षम लाल कांदा केंद्र',
    lat: 20.5912,
    lng: 74.2045,
  },
  {
    id: 'chandwad_v',
    name: 'Chandwad Highland Central Depot',
    name_mr: 'चांदवड मध्यवर्ती डेपो (वडनेर पट्टा)',
    name_hi: 'चांदवड़ मध्यवर्ती डिपो',
    taluka: 'Chandwad',
    registeredMembers: 240,
    clusterType: 'Summer Onion Storage & Dispatch Hub',
    clusterType_mr: 'उन्हाळ कांदा साठवणूक व विक्री',
    lat: 20.3275,
    lng: 74.2407,
  },
  {
    id: 'malegaon_v',
    name: 'Malegaon Commercial Aggregation Yard',
    name_mr: 'मालेगाव व्यावसायिक संकलन आवार',
    name_hi: 'मालेगांव व्यावसायिक संकलन केंद्र',
    taluka: 'Malegaon',
    registeredMembers: 410,
    clusterType: 'North Nashik Multi-Crop Depot',
    clusterType_mr: 'उत्तर नाशिक बहुपीक डेपो',
    lat: 20.5539,
    lng: 74.5288,
  },
];
