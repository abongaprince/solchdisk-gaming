export interface User {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  whatsapp?: string;
  role: 'client' | 'admin';
  ville?: string;
  quartier?: string;
  pays?: string;
  photo_profil?: string;
  date_creation?: string;
}

export interface Game {
  id: number | string;
  titre: string;
  description: string;
  prix: number;
  image: string;
  cpu: string;
  gpu: string;
  ram: string;
  storage: string;
  os: string;
  directx: string;
  date_ajout: string;
  isPack?: boolean;
  games?: Game[];
}

export interface Order {
  id: number;
  user_id: number;
  game_id: number | null;
  disque_dur_option: 'client' | 'fourni';
  livraison_societe: 'Yango' | 'Waren' | 'Expédition' | 'Récupérer soi-même';
  statut: 'En attente' | 'En cours' | 'Livrée';
  preuve_paiement: string;
  games_list?: string;
  date_commande: string;
  game_title?: string;
  game_image?: string;
  user_nom?: string;
  user_prenom?: string;
  user_email?: string;
  user_whatsapp?: string;
  user_ville?: string;
  user_quartier?: string;
  user_pays?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
