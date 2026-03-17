import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  Gamepad2, 
  Search, 
  ChevronRight,
  Package,
  ShieldCheck,
  LayoutDashboard,
  History,
  Info,
  Mail,
  Sun,
  Moon,
  Trash2,
  Plus,
  Edit,
  Upload,
  AlertCircle,
  Cpu,
  Monitor,
  HardDrive,
  Layers,
  CheckCircle2,
  Facebook,
  Trophy,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { AuthState, User, Game, Order } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Auth Context ---
interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Theme Context ---
interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// --- Components ---
const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  const updateCartCount = () => {
    if (!isAuthenticated) {
      setCartCount(0);
      return;
    }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.length);
  };

  useEffect(() => {
    updateCartCount();
    
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, [isAuthenticated]);

  useEffect(() => {
    updateCartCount();
  }, [location, isAuthenticated]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-nav backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2 group text-primary">
            <div className="w-10 h-10 bg-neon-green rounded-sm flex items-center justify-center group-hover:shadow-[0_0_15px_#00FF7F] transition-all">
              <Gamepad2 className="text-black w-6 h-6" />
            </div>
            <span className="font-display text-xl font-bold tracking-tighter">
              SolchDisk <span className="text-neon-green">gaming</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/catalogue" className="text-sm font-display uppercase tracking-widest hover:text-neon-green transition-colors text-primary">Catalogue</Link>
            <Link to="/about" className="text-sm font-display uppercase tracking-widest hover:text-neon-green transition-colors text-primary">À Propos</Link>
            <Link to="/contact" className="text-sm font-display uppercase tracking-widest hover:text-neon-green transition-colors text-primary">Contact</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-neon-green transition-all text-primary group"
              title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-neon-green" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Clair</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-neon-green" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Sombre</span>
                </>
              )}
            </button>
            {isAuthenticated && user?.role === 'client' && (
              <Link to="/cart" className="p-2 hover:text-neon-green transition-colors relative text-primary">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-neon-green text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_#39FF14]">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link to={user?.role === 'admin' ? "/admin" : "/profile"} className="flex items-center gap-2 text-sm font-display uppercase tracking-widest hover:text-neon-green transition-colors text-primary">
                  {user?.photo_profil ? (
                    <img src={user.photo_profil} className="w-6 h-6 rounded-full object-cover border border-neon-green/30" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                  <span>{user?.nom}</span>
                </Link>
                <button onClick={logout} className="p-2 hover:text-neon-red transition-colors text-primary">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-neon btn-neon-outline">Connexion</Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 hover:text-neon-green transition-colors text-primary"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-primary">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-dark-card border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-8 space-y-4">
              <Link to="/catalogue" className="block py-2 text-lg font-display uppercase text-primary border-b border-white/5" onClick={() => setIsMenuOpen(false)}>Catalogue</Link>
              <Link to="/about" className="block py-2 text-lg font-display uppercase text-primary border-b border-white/5" onClick={() => setIsMenuOpen(false)}>À Propos</Link>
              <Link to="/contact" className="block py-2 text-lg font-display uppercase text-primary border-b border-white/5" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              {isAuthenticated && user?.role === 'client' && (
                <Link to="/cart" className="flex items-center justify-between py-2 text-lg font-display uppercase text-primary border-b border-white/5" onClick={() => setIsMenuOpen(false)}>
                  <span>Panier</span>
                  {cartCount > 0 && (
                    <span className="bg-neon-green text-black text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_#39FF14]">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  <Link to={user?.role === 'admin' ? "/admin" : "/profile"} className="flex items-center gap-3 py-2 text-lg font-display uppercase text-primary border-b border-white/5" onClick={() => setIsMenuOpen(false)}>
                    {user?.photo_profil ? (
                      <img src={user.photo_profil} className="w-8 h-8 rounded-full object-cover border border-neon-green/30" />
                    ) : (
                      <UserIcon className="w-6 h-6" />
                    )}
                    <span>Profil</span>
                  </Link>
                  <button onClick={() => { logout(); setIsMenuOpen(false); }} className="block py-2 text-lg font-display uppercase text-neon-red w-full text-left">Déconnexion</button>
                </>
              ) : (
                <Link to="/login" className="block py-4 text-center text-lg font-display uppercase bg-neon-green text-black font-bold rounded-sm mt-4" onClick={() => setIsMenuOpen(false)}>Connexion</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-dark-card border-t border-white/5 py-12 mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-6 text-primary">
            <div className="w-8 h-8 bg-neon-green rounded-sm flex items-center justify-center">
              <Gamepad2 className="text-black w-5 h-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tighter uppercase italic">
              SolchDisk <span className="text-neon-green">gaming</span>
            </span>
          </Link>
          <p className="text-muted max-w-md leading-relaxed">
            Votre destination ultime pour les meilleurs jeux PC. Performance, style et immersion totale dans l'univers du gaming.
          </p>
          <div className="flex gap-4 mt-8">
            <a href="https://facebook.com/soppy.levy.charles" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center hover:border-neon-green hover:text-neon-green transition-all">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="https://www.tiktok.com/@jeuxpcsolch" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 border border-white/10 rounded-sm flex items-center justify-center hover:border-neon-green hover:text-neon-green transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.36-.54.38-.89.98-1.03 1.64-.13.47-.12.95-.04 1.42.18.47.7.83 1.15 1.01 1.38.55 3.15-.05 3.75-1.44.12-.27.14-.57.15-.86.01-4.42-.01-8.84.01-13.26z"/>
              </svg>
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-widest mb-6 text-primary">Navigation</h4>
          <ul className="space-y-4 text-muted text-sm">
            <li><Link to="/catalogue" className="hover:text-neon-green transition-colors">Catalogue</Link></li>
            <li><Link to="/about" className="hover:text-neon-green transition-colors">À Propos</Link></li>
            <li><Link to="/contact" className="hover:text-neon-green transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm uppercase tracking-widest mb-6 text-primary">Légal</h4>
          <ul className="space-y-4 text-muted text-sm">
            <li><Link to="#" className="hover:text-neon-green transition-colors">CGV</Link></li>
            <li><Link to="#" className="hover:text-neon-green transition-colors">Confidentialité</Link></li>
            <li><Link to="#" className="hover:text-neon-green transition-colors">Mentions Légales</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 mt-12 pt-8 text-center text-muted text-xs uppercase tracking-widest">
        © 2026 ABONGA ADJA PRINCE EMMANUEL. All rights reserved. Built for Gamers.
      </div>
    </div>
  </footer>
);

// --- Pages ---

const Home = () => {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black mb-6 leading-tight text-primary uppercase">
              Le gaming, <span className="text-neon-green">sans compromis.</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary mb-10 leading-relaxed max-w-2xl">
              Découvrez une sélection exclusive des titres les plus attendus. 
              Des graphismes époustouflants, des histoires immersives et une performance sans compromis.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/catalogue" className="btn-neon btn-neon-green px-10 py-4 text-lg">
                Explorer le Catalogue
              </Link>
              <Link to="/about" className="btn-neon btn-neon-outline px-10 py-4 text-lg">
                En Savoir Plus
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-dark-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Package className="w-10 h-10 text-neon-blue" />, title: "Livraison Rapide", desc: "Recevez vos jeux en un temps record via Yango ou Waren." },
              { icon: <ShieldCheck className="w-10 h-10 text-neon-green" />, title: "Paiement Sécurisé", desc: "Transactions mobiles vérifiées pour une sécurité totale." },
              { icon: <Info className="w-10 h-10 text-neon-red" />, title: "Support 24/7", desc: "Une équipe dédiée pour vous accompagner dans vos aventures." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="p-8 bg-dark-card border border-white/5 rounded-sm neon-border"
              >
                <div className="mb-6">{f.icon}</div>
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">{f.title}</h3>
                <p className="text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-green/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase mb-4">Nos <span className="text-neon-green">Offres Spéciales</span></h2>
            <p className="text-muted uppercase tracking-widest text-sm">Des packs conçus pour les vrais passionnés</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10 }}
              className="bg-dark-card border border-neon-green/30 p-10 rounded-sm relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-neon-green text-black font-black px-6 py-2 text-xs uppercase tracking-widest">Populaire</div>
              <h3 className="text-3xl font-black mb-4 uppercase">Pack SolchDisk</h3>
              <p className="text-neon-green font-display text-2xl mb-6">30 000 FCFA</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Disque dur 500 Go externe inclus</span>
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Jusqu'à 12 jeux PC de votre choix installés</span>
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Prêt à jouer immédiatement</span>
                </li>
              </ul>
              <Link to="/catalogue" className="btn-neon btn-neon-outline w-full py-4 text-center block">
                Choisir mes jeux
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10 }}
              className="bg-dark-card border border-white/10 p-10 rounded-sm relative group overflow-hidden"
            >
              <h3 className="text-3xl font-black mb-4 uppercase">Installation Seule</h3>
              <p className="text-neon-green font-display text-2xl mb-6">15 000 FCFA</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Installation sur votre propre support</span>
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Jusqu'à 12 jeux PC de votre choix</span>
                </li>
                <li className="flex items-center gap-3 text-secondary">
                  <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  <span>Optimisation des performances incluse</span>
                </li>
              </ul>
              <Link to="/catalogue" className="btn-neon btn-neon-outline w-full py-4 text-center block">
                Choisir mes jeux
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Catalogue = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectingOffer, setSelectingOffer] = useState<any>(null);
  const [offerGames, setOfferGames] = useState<Game[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const OFFERS = [
    { 
      id: 'pack_solchdisk', 
      titre: 'Disque dur fourni', 
      prix: 30000, 
      desc: '500 Go, jusqu\'à 12 jeux inclus', 
      details: 'Pack complet avec disque dur externe de 500 Go et jusqu\'à 12 jeux de votre choix.' 
    },
    { 
      id: 'installation_seule', 
      titre: 'Installation sur disque dur du client', 
      prix: 15000, 
      desc: 'jusqu\'à 12 jeux inclus', 
      details: 'Installation de jusqu\'à 12 jeux de votre choix sur votre propre disque dur.' 
    }
  ];

  useEffect(() => {
    axios.get('/api/games').then(res => {
      setGames(res.data);
      setFilteredGames(res.data);
      setLoading(false);
    });
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const filtered = games.filter(game => 
      game.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGames(filtered);
  };

  const handleOfferSelection = (offer: any) => {
    setSelectingOffer(offer);
    setOfferGames([]);
  };

  const toggleGameForOffer = (game: Game) => {
    if (offerGames.find(g => g.id === game.id)) {
      setOfferGames(offerGames.filter(g => g.id !== game.id));
    } else if (offerGames.length < 12) {
      setOfferGames([...offerGames, game]);
    }
  };

  const confirmOffer = () => {
    if (offerGames.length < 1 || offerGames.length > 12) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const packItem = {
      isPack: true,
      id: selectingOffer.id,
      titre: selectingOffer.titre,
      prix: selectingOffer.prix,
      games: offerGames,
      image: 'https://picsum.photos/seed/pack/800/600'
    };
    localStorage.setItem('cart', JSON.stringify([...cart, packItem]));
    navigate('/cart');
  };

  return (
    <div className="pt-32 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {!selectingOffer ? (
        <>
          <div className="mb-16">
            <h2 className="text-3xl font-black mb-8 uppercase flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-neon-blue" />
              Offres Spéciales <span className="text-neon-blue">Gaming</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {OFFERS.map(offer => (
                <motion.div 
                  key={offer.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-dark-card border border-neon-blue/20 p-8 rounded-sm relative overflow-hidden group cursor-pointer"
                  onClick={() => {
                    if (user?.role === 'client') {
                      handleOfferSelection(offer);
                    } else if (!user) {
                      navigate('/login');
                    } else {
                      alert('Seuls les clients peuvent profiter de ces offres.');
                    }
                  }}
                >
                  <div className="absolute top-0 right-0 bg-neon-blue text-black font-black px-4 py-1 text-xs uppercase">Offre</div>
                  <h3 className="text-2xl font-black mb-2 uppercase text-primary">{offer.titre}</h3>
                  <p className="text-neon-blue font-display text-xl mb-4">{offer.prix.toLocaleString()} FCFA</p>
                  <p className="text-muted text-sm mb-6 leading-relaxed">{offer.details}</p>
                  <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-neon-blue group-hover:gap-4 transition-all">
                    {user?.role === 'client' ? 'Choisir mes jeux (max 12)' : 'Connectez-vous pour choisir'} <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h2 className="text-4xl font-black mb-2 uppercase">Catalogue de <span className="text-neon-green">Jeux</span></h2>
              <p className="text-muted uppercase tracking-widest text-sm">Trouvez votre prochaine obsession</p>
            </div>
            <form onSubmit={handleSearch} className="relative w-full md:w-96 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input 
                  type="text" 
                  placeholder="Nom du jeu..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-input border border-white/10 rounded-sm py-3 pl-12 pr-4 focus:border-neon-green outline-none transition-all text-primary"
                />
              </div>
              <button type="submit" className="btn-neon bg-neon-green text-black px-6 py-3 font-bold uppercase text-xs">
                Rechercher
              </button>
            </form>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <motion.div 
                    key={game.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    className="bg-dark-card border border-white/5 rounded-sm overflow-hidden group neon-border"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={game.image} 
                        alt={game.titre} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1 text-neon-green font-display text-sm border border-neon-green/30">
                        {game.prix.toLocaleString()} FCFA
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2 truncate uppercase">{game.titre}</h3>
                      <p className="text-muted text-sm line-clamp-2 mb-6 h-10">{game.description}</p>
                      <Link to={`/jeu/${game.id}`} className="btn-neon btn-neon-outline w-full block text-center">
                        Détails
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-muted uppercase tracking-widest">Aucun jeu trouvé pour "{searchTerm}"</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilteredGames(games);
                    }}
                    className="mt-4 text-neon-green text-xs uppercase tracking-widest hover:underline"
                  >
                    Voir tout le catalogue
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-dark-card p-8 border border-neon-blue/30 rounded-sm sticky top-24 z-40 backdrop-blur-md">
            <div>
              <h2 className="text-2xl font-black uppercase text-primary">Sélectionnez vos <span className="text-neon-blue">Jeux</span></h2>
              <p className="text-muted text-sm uppercase tracking-widest">Offre: {selectingOffer.titre} ({offerGames.length}/12)</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setSelectingOffer(null)} className="btn-neon btn-neon-outline px-8">Annuler</button>
              <button 
                onClick={confirmOffer} 
                disabled={offerGames.length < 1}
                className={cn("btn-neon px-8", offerGames.length >= 1 ? "bg-neon-blue text-black" : "bg-white/5 text-white/20 cursor-not-allowed")}
              >
                Valider l'Offre
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredGames.map((game) => {
              const isSelected = offerGames.find(g => g.id === game.id);
              return (
                <motion.div 
                  key={game.id}
                  onClick={() => toggleGameForOffer(game)}
                  className={cn(
                    "bg-dark-card border rounded-sm overflow-hidden group cursor-pointer transition-all",
                    isSelected ? "border-neon-blue shadow-[0_0_15px_rgba(0,240,255,0.3)]" : "border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={game.image} alt={game.titre} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-neon-blue/20 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-neon-blue" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold uppercase truncate text-sm">{game.titre}</h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const GameDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    axios.get(`/api/games/${id}`).then(res => setGame(res.data));
  }, [id]);

  if (!game) return null;

  const specs = [
    { icon: <Cpu className="w-4 h-4" />, label: "CPU", value: game.cpu },
    { icon: <Monitor className="w-4 h-4" />, label: "GPU", value: game.gpu },
    { icon: <Layers className="w-4 h-4" />, label: "RAM", value: game.ram },
    { icon: <HardDrive className="w-4 h-4" />, label: "Stockage", value: game.storage },
    { icon: <Info className="w-4 h-4" />, label: "Système d'Exploitation", value: game.os },
    { icon: <ShieldCheck className="w-4 h-4" />, label: "DirectX", value: game.directx },
  ];

  return (
    <div className="pt-32 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-neon-green/20 blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
          <img src={game.image} alt={game.titre} className="relative w-full rounded-sm border border-white/10 shadow-2xl" />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <h1 className="text-5xl font-black mb-4 uppercase leading-tight">{game.titre}</h1>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-3xl font-display text-neon-green">{game.prix.toLocaleString()} FCFA</span>
            <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue text-xs font-display uppercase border border-neon-blue/30">En Stock</span>
          </div>
          
          <div className="space-y-8 mb-10">
            <div>
              <h4 className="text-sm font-display uppercase tracking-widest text-muted mb-3">Description</h4>
              <p className="text-secondary leading-relaxed">{game.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-display uppercase tracking-widest text-muted mb-3">Configuration Requise</h4>
              <div className="grid grid-cols-2 gap-4">
                {specs.map((spec, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-sm flex items-center gap-3">
                    <div className="text-neon-blue">{spec.icon}</div>
                    <div>
                      <p className="text-[10px] uppercase text-muted tracking-widest">{spec.label}</p>
                      <p className="text-xs font-mono text-secondary">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            {user?.role === 'client' && (
              <button 
                onClick={() => {
                  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                  localStorage.setItem('cart', JSON.stringify([...cart, game]));
                  navigate('/cart');
                }}
                className="btn-neon btn-neon-green w-full py-4 text-lg flex items-center justify-center gap-3"
              >
                <ShoppingCart className="w-5 h-5" />
                Ajouter au Panier
              </button>
            )}
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/admin')}
                className="btn-neon bg-neon-blue text-black w-full py-4 text-lg flex items-center justify-center gap-3"
              >
                <Edit className="w-5 h-5" />
                Modifier (Admin)
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      const res = await axios.post('/api/login', data);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/profile');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    }
  };

  return (
    <div className="pt-40 pb-20 flex justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-white/10 p-10 rounded-sm shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>
        <h2 className="text-3xl font-black mb-8 uppercase">Connexion</h2>
        
        {error && (
          <div className="bg-neon-red/10 border border-neon-red/30 text-neon-red p-4 mb-6 text-sm flex items-center gap-3">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Email ou WhatsApp</label>
            <input 
              {...register('email', { required: 'Email ou WhatsApp requis' })}
              type="text" 
              placeholder="Email ou +225..."
              className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-green outline-none transition-all text-primary"
            />
            {errors.email && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.email.message as string}</span>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-display uppercase tracking-widest text-muted">Mot de passe</label>
              <Link 
                to="/forgot-password"
                className="text-[10px] text-neon-green hover:underline uppercase tracking-tighter"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input 
                {...register('mot_de_passe', { required: 'Mot de passe requis' })}
                type={showPassword ? "text" : "password"} 
                className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-green outline-none transition-all text-primary pr-12"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-neon-green transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.mot_de_passe && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.mot_de_passe.message as string}</span>}
          </div>
          <button type="submit" className="btn-neon btn-neon-green w-full py-4 mt-4">
            Se Connecter
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-muted">
          Pas encore de compte ? <Link to="/register" className="text-neon-green hover:underline">S'inscrire</Link>
        </p>
      </motion.div>
    </div>
  );
};

const ForgotPassword = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      const res = await axios.post('/api/forgot-password', data);
      setMessage(res.data.message);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
      setMessage('');
    }
  };

  return (
    <div className="pt-40 pb-20 flex justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-white/10 p-10 rounded-sm shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>
        <h2 className="text-2xl font-black mb-6 uppercase">Réinitialisation</h2>
        
        {message && (
          <div className="bg-neon-green/10 border border-neon-green/30 text-neon-green p-4 mb-6 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4" />
            {message}
          </div>
        )}

        {error && (
          <div className="bg-neon-red/10 border border-neon-red/30 text-neon-red p-4 mb-6 text-sm flex items-center gap-3">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        <p className="text-muted text-sm mb-6">
          Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Email</label>
            <input 
              {...register('email', { required: 'Email requis' })}
              type="email" 
              className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-green outline-none transition-all text-primary"
            />
            {errors.email && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.email.message as string}</span>}
          </div>
          <button type="submit" className="btn-neon btn-neon-green w-full py-4 mt-4">
            Envoyer le lien
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-muted">
          <Link to="/login" className="text-neon-green hover:underline">Retour à la connexion</Link>
        </p>
      </motion.div>
    </div>
  );
};

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    if (data.mot_de_passe !== data.confirm_password) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await axios.post('/api/reset-password', { token, mot_de_passe: data.mot_de_passe });
      setSuccess(true);
      setError('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré');
    }
  };

  if (success) {
    return (
      <div className="pt-40 pb-20 flex justify-center px-4">
        <div className="w-full max-w-md bg-dark-card border border-white/10 p-10 rounded-sm text-center">
          <CheckCircle2 className="w-16 h-16 text-neon-green mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4 uppercase">Succès !</h2>
          <p className="text-muted">Votre mot de passe a été réinitialisé avec succès. Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-20 flex justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-white/10 p-10 rounded-sm shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-green"></div>
        <h2 className="text-2xl font-black mb-6 uppercase">Nouveau mot de passe</h2>
        
        {error && (
          <div className="bg-neon-red/10 border border-neon-red/30 text-neon-red p-4 mb-6 text-sm flex items-center gap-3">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input 
                {...register('mot_de_passe', { required: 'Mot de passe requis', minLength: { value: 6, message: 'Minimum 6 caractères' } })}
                type={showPassword ? "text" : "password"} 
                className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-green outline-none transition-all text-primary pr-12"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-neon-green transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.mot_de_passe && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.mot_de_passe.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Confirmer le mot de passe</label>
            <input 
              {...register('confirm_password', { required: 'Confirmation requise' })}
              type={showPassword ? "text" : "password"} 
              className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-green outline-none transition-all text-primary"
            />
            {errors.confirm_password && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.confirm_password.message as string}</span>}
          </div>
          <button type="submit" className="btn-neon btn-neon-green w-full py-4 mt-4">
            Réinitialiser
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    const { confirm_password, ...rest } = data;
    if (data.mot_de_passe !== confirm_password) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await axios.post('/api/register', rest);
      setIsSuccess(true);
      setError('');
      
      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#00FF7F', '#FFFFFF']
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur d\'inscription');
    }
  };

  if (isSuccess) {
    return (
      <div className="pt-40 pb-20 flex justify-center px-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-dark-card border border-neon-blue/30 p-12 rounded-sm text-center shadow-[0_0_50px_rgba(0,240,255,0.2)]"
        >
          <div className="w-20 h-20 bg-neon-blue/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-neon-blue" />
          </div>
          <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Bienvenue !</h2>
          <p className="text-secondary text-lg mb-8">
            Votre compte a été créé avec succès. Préparez-vous pour une expérience gaming ultime.
          </p>
          <div className="flex items-center justify-center gap-3 text-muted text-sm">
            <div className="w-4 h-4 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
            Redirection vers la connexion...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-20 flex justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-dark-card border border-white/10 p-10 rounded-sm shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue"></div>
        <h2 className="text-3xl font-black mb-8 uppercase">Inscription</h2>
        
        {error && (
          <div className="bg-neon-red/10 border border-neon-red/30 text-neon-red p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Nom</label>
            <input {...register('nom', { required: 'Nom requis' })} className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.nom && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.nom.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Prénom</label>
            <input {...register('prenom', { required: 'Prénom requis' })} className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.prenom && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.prenom.message as string}</span>}
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Email</label>
            <input {...register('email', { required: 'Email requis' })} type="email" className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.email && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.email.message as string}</span>}
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Numéro WhatsApp</label>
            <input {...register('whatsapp', { required: 'Numéro WhatsApp requis' })} type="text" placeholder="+225 ..." className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.whatsapp && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.whatsapp.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Mot de passe</label>
            <div className="relative">
              <input 
                {...register('mot_de_passe', { required: 'Mot de passe requis', minLength: { value: 6, message: '6 caractères minimum' } })} 
                type={showPassword ? "text" : "password"} 
                className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary pr-12" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-neon-blue transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.mot_de_passe && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.mot_de_passe.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Confirmation</label>
            <input 
              {...register('confirm_password', { required: 'Confirmation requise' })} 
              type={showPassword ? "text" : "password"} 
              className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" 
            />
            {errors.confirm_password && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.confirm_password.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Ville</label>
            <input {...register('ville', { required: 'Ville requise' })} className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.ville && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.ville.message as string}</span>}
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Quartier</label>
            <input {...register('quartier', { required: 'Quartier requis' })} className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.quartier && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.quartier.message as string}</span>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-display uppercase tracking-widest text-muted mb-2">Pays</label>
            <input {...register('pays', { required: 'Pays requis' })} className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
            {errors.pays && <span className="text-neon-red text-[10px] uppercase mt-1">{errors.pays.message as string}</span>}
          </div>
          <button type="submit" className="md:col-span-2 btn-neon bg-neon-blue text-black hover:bg-white hover:shadow-[0_0_20px_#00F0FF] py-4 mt-4">
            Créer mon Compte
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Cart = () => {
  const [items, setItems] = useState<Game[]>([]);
  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [serviceOption, setServiceOption] = useState<'fourni' | 'client'>('fourni');

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(cart);
  }, []);

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const totalGamesPrice = items.reduce((acc, item: any) => acc + (item.isPack ? 0 : item.prix), 0);
  const totalPacksPrice = items.reduce((acc, item: any) => acc + (item.isPack ? item.prix : 0), 0);
  
  // If no pack is in cart, servicePrice is 15000 for HDD or 0 if client has one
  const servicePrice = serviceOption === 'fourni' ? 15000 : 0;
  
  const hasPack = items.some((item: any) => item.isPack);
  const totalPrice = (hasPack ? 0 : servicePrice) + totalGamesPrice + totalPacksPrice;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated) return navigate('/login');
    if (!proofPreview) return alert('Veuillez uploader une capture d\'écran du paiement');

    const formData = new FormData(e.currentTarget);
    const livraison_societe = formData.get('livraison_societe');

    try {
      // Create a single order for the whole pack/service
      const gamesList = items.some((item: any) => item.isPack) 
        ? JSON.stringify(items.find((item: any) => item.isPack).games.map((g: any) => g.titre))
        : null;

      await axios.post('/api/orders', {
        game_id: items[0]?.isPack ? null : items[0]?.id,
        disque_dur_option: serviceOption,
        livraison_societe,
        preuve_paiement: proofPreview,
        games_list: gamesList
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.removeItem('cart');
      navigate('/profile');
    } catch (err) {
      alert('Erreur lors de la commande');
    }
  };

  if (items.length === 0) {
    return (
      <div className="pt-40 text-center min-h-screen">
        <ShoppingCart className="w-20 h-20 mx-auto text-muted/20 mb-6" />
        <h2 className="text-3xl font-black uppercase mb-4 text-primary">Votre panier est vide</h2>
        <Link to="/catalogue" className="btn-neon btn-neon-green">Aller au Catalogue</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <h2 className="text-4xl font-black mb-12 uppercase">Mon <span className="text-neon-green">Panier</span></h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {!hasPack && (
            <div className="bg-neon-blue/5 border border-neon-blue/20 p-6 rounded-sm mb-8">
              <h3 className="text-lg font-bold uppercase mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-neon-blue" />
                Options de Service
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setServiceOption('fourni')}
                  className={`p-4 border rounded-sm text-left transition-all ${serviceOption === 'fourni' ? 'border-neon-blue bg-neon-blue/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                >
                  <p className="font-bold uppercase text-sm mb-1">Achat Disque Dur</p>
                  <p className="text-xs text-secondary mb-2">Disque dur 500 Go fourni par SolchDisk</p>
                  <p className="text-neon-blue font-display">15 000 FCFA</p>
                  <ul className="mt-3 space-y-1">
                    <li className="text-[10px] text-muted flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Prêt à jouer immédiatement</li>
                    <li className="text-[10px] text-muted flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Support neuf et garanti</li>
                  </ul>
                </button>
                <button 
                  onClick={() => setServiceOption('client')}
                  className={`p-4 border rounded-sm text-left transition-all ${serviceOption === 'client' ? 'border-neon-blue bg-neon-blue/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                >
                  <p className="font-bold uppercase text-sm mb-1">Support Client</p>
                  <p className="text-xs text-secondary mb-2">Installation sur votre propre disque dur</p>
                  <p className="text-neon-blue font-display">0 FCFA</p>
                  <ul className="mt-3 space-y-1">
                    <li className="text-[10px] text-muted flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Économique & Flexible</li>
                    <li className="text-[10px] text-muted flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Utilise votre matériel</li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          <h3 className="text-lg font-bold uppercase mb-4">Articles Sélectionnés</h3>
          {items.map((item: any, i) => (
            <div key={i} className="bg-dark-card border border-white/5 p-6 flex gap-6 items-center rounded-sm">
              <img src={item.image} alt={item.titre} className="w-24 h-24 object-cover rounded-sm" />
              <div className="flex-1">
                <h3 className="font-bold uppercase tracking-wider">{item.titre}</h3>
                <p className="text-neon-green font-display">{item.prix.toLocaleString()} FCFA</p>
                {item.isPack && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted uppercase mb-2">Pack de 12 jeux inclus</p>
                    <div className="flex flex-wrap gap-1">
                      {item.games.map((g: any) => (
                        <span key={g.id} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5 text-muted truncate max-w-[80px]">
                          {g.titre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => removeItem(i)} className="p-2 text-muted hover:text-neon-red transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-dark-card border border-white/10 p-8 rounded-sm h-fit sticky top-32">
          <h3 className="text-xl font-bold mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Validation</h3>
          
          {!showPaymentInfo ? (
            <div className="space-y-6">
              <div className="bg-neon-blue/10 border border-neon-blue/30 p-4 rounded-sm">
                <div className="flex items-center gap-2 text-neon-blue mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-display uppercase tracking-widest">Instructions de Paiement</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Veuillez effectuer le paiement total sur l'un des numéros suivants avant de valider votre commande.
                </p>
              </div>
              
              <div className="space-y-3">
                {[
                  { label: "Moov et Wave", num: "+225 43 40 78 01" },
                  { label: "MTN Money", num: "05 46 68 27 59" }
                ].map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-sm">
                    <span className="text-[10px] font-display uppercase text-muted">{p.label}</span>
                    <span className="text-sm font-mono text-neon-green">{p.num}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted uppercase">Service</span>
                  <span className="text-secondary">{servicePrice.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted uppercase">Jeux</span>
                  <span className="text-secondary">{totalGamesPrice.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span className="uppercase text-sm">Total</span>
                  <span className="text-neon-green">{totalPrice.toLocaleString()} FCFA</span>
                </div>
              </div>

              {user?.role === 'admin' ? (
                <div className="mt-6 p-4 bg-neon-red/10 border border-neon-red/20 rounded-sm">
                  <p className="text-xs text-neon-red uppercase tracking-widest font-bold text-center">
                    Les administrateurs ne peuvent pas passer de commandes.
                  </p>
                </div>
              ) : (
                <button 
                  onClick={() => setShowPaymentInfo(true)}
                  className="btn-neon btn-neon-green w-full py-4 mt-4"
                >
                  J'ai effectué le paiement
                </button>
              )}
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleCheckout}>
              <div className="bg-white/5 border border-white/10 p-4 rounded-sm">
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-neon-green mb-3 font-black">Informations de Livraison</h4>
                <div className="space-y-2">
                  <p className="text-xs"><span className="text-muted uppercase">Client:</span> <span className="text-primary">{user?.nom} {user?.prenom}</span></p>
                  <p className="text-xs"><span className="text-muted uppercase">Adresse:</span> <span className="text-primary">{user?.ville}, {user?.quartier}</span></p>
                  <p className="text-xs"><span className="text-muted uppercase">Pays:</span> <span className="text-primary">{user?.pays}</span></p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-neon-red uppercase font-bold leading-tight">
                    * La livraison est à votre charge. Les frais sont à régler directement au livreur.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-display uppercase tracking-widest text-muted mb-3">Société de Livraison</label>
                <select name="livraison_societe" required className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 outline-none focus:border-neon-green text-primary">
                  <option value="Yango" className="bg-dark-card text-primary">Yango Delivery</option>
                  <option value="Waren" className="bg-dark-card text-primary">Waren Express</option>
                  <option value="Expédition" className="bg-dark-card text-primary">Expédition (Hors ville)</option>
                  <option value="Récupérer soi-même" className="bg-dark-card text-primary">Récupérer soi-même</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-display uppercase tracking-widest text-muted mb-3">Preuve de Paiement (Capture d'écran)</label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    required
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-32 bg-white/5 border border-dashed border-white/20 rounded-sm flex flex-col items-center justify-center group-hover:border-neon-green transition-all overflow-hidden">
                    {proofPreview ? (
                      <img src={proofPreview} className="w-full h-full object-cover" alt="Preuve" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted mb-2" />
                        <span className="text-[10px] uppercase text-muted">Cliquez pour uploader</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between mb-4">
                  <span className="text-muted uppercase text-xs tracking-widest">Total à payer</span>
                  <span className="text-xl font-display text-neon-green">
                    {totalPrice.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowPaymentInfo(false)}
                    className="btn-neon btn-neon-outline flex-1"
                  >
                    Retour
                  </button>
                  <button type="submit" className="btn-neon btn-neon-green flex-[2] py-4">
                    Valider
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, token, login } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    whatsapp: user?.whatsapp || '',
    ville: user?.ville || '',
    quartier: user?.quartier || '',
    pays: user?.pays || '',
    photo_profil: user?.photo_profil || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchOrders = () => {
    if (token) {
      axios.get('/api/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setOrders(res.data));
    }
  };

  const fetchProfile = () => {
    if (token) {
      axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        login(token, res.data.user);
      }).catch(err => {
        console.error('Erreur lors du chargement du profil:', err);
      });
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (user && !isEditing) {
      setEditData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        whatsapp: user.whatsapp || '',
        ville: user.ville || '',
        quartier: user.quartier || '',
        pays: user.pays || '',
        photo_profil: user.photo_profil || ''
      });
    }
  }, [user, isEditing]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await axios.put('/api/profile', editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local user state
      login(token!, response.data.user);
      setIsEditing(false);
      setUpdateSuccess(true);
      
      // Trigger confetti animation
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FF7F', '#00F0FF', '#FFFFFF']
      });

      setTimeout(() => setUpdateSuccess(false), 5000);
    } catch (err) {
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, photo_profil: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelOrder = async (id: number) => {
    if (!confirm('Voulez-vous vraiment annuler cette commande ?')) return;
    try {
      await axios.delete(`/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
      alert('Votre commande a été annulée. Le remboursement sera effectué dans un délai de 3 jours.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'annulation');
    }
  };

  return (
    <div className="pt-32 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-1">
          <div className="bg-dark-card border border-white/10 p-8 rounded-sm text-center sticky top-32">
            <div className="relative group mx-auto mb-6 w-24 h-24">
              <div className="w-24 h-24 bg-neon-green/20 rounded-full flex items-center justify-center overflow-hidden border border-neon-green/30">
                {editData.photo_profil ? (
                  <img src={editData.photo_profil} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-neon-green" />
                )}
              </div>
              {isEditing && (
                <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
            
            {!isEditing ? (
              <>
                <h3 className="text-xl font-bold uppercase mb-2">{user?.nom || ''} {user?.prenom || ''}</h3>
                <p className="text-muted text-sm mb-1">{user?.email}</p>
                <p className="text-neon-green text-xs font-mono mb-6">{user?.whatsapp}</p>
                <div className="text-left space-y-4 pt-6 border-t border-white/5 mb-6">
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Localisation</span>
                    <p className="text-sm">{(user?.ville || 'Non renseigné')}, {(user?.quartier || 'Non renseigné')}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-muted mb-1">Pays</span>
                    <p className="text-sm">{user?.pays || 'Non renseigné'}</p>
                  </div>
                </div>

                {updateSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-6 p-4 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-sm flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,127,0.1)]"
                  >
                    <div className="w-10 h-10 bg-neon-green rounded-full flex items-center justify-center mb-1">
                      <Trophy className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Félicitations !</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-80">Profil mis à jour avec succès</span>
                  </motion.div>
                )}

                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-neon btn-neon-outline w-full py-2 text-xs"
                >
                  Modifier le Profil
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Nom</label>
                  <input 
                    type="text" 
                    required
                    value={editData.nom} 
                    onChange={e => setEditData({...editData, nom: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Prénom</label>
                  <input 
                    type="text" 
                    required
                    value={editData.prenom} 
                    onChange={e => setEditData({...editData, prenom: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">WhatsApp</label>
                  <input 
                    type="text" 
                    required
                    value={editData.whatsapp} 
                    onChange={e => setEditData({...editData, whatsapp: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Ville</label>
                  <input 
                    type="text" 
                    value={editData.ville} 
                    onChange={e => setEditData({...editData, ville: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Quartier</label>
                  <input 
                    type="text" 
                    value={editData.quartier} 
                    onChange={e => setEditData({...editData, quartier: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted mb-1">Pays</label>
                  <input 
                    type="text" 
                    value={editData.pays} 
                    onChange={e => setEditData({...editData, pays: e.target.value})}
                    className="w-full bg-input border border-white/10 rounded-sm py-2 px-3 text-sm outline-none focus:border-neon-green text-primary"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    disabled={isSaving}
                    onClick={() => setIsEditing(false)} 
                    className="btn-neon btn-neon-outline flex-1 py-2 text-xs disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="btn-neon btn-neon-green flex-1 py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Enregistrement...' : 'Sauver'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
            <History className="w-6 h-6 text-neon-blue" />
            Historique des <span className="text-neon-blue">Commandes</span>
          </h2>

          <div className="space-y-6">
            {orders.length === 0 ? (
              <p className="text-white/30 py-12 text-center border border-dashed border-white/10 rounded-sm">Aucune commande effectuée.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-dark-card border border-white/5 p-6 rounded-sm flex flex-col md:flex-row gap-6 items-center">
                  <img src={order.game_image || 'https://picsum.photos/seed/pack/800/600'} className="w-20 h-20 object-cover rounded-sm" />
                  <div className="flex-1">
                    <h4 className="font-bold uppercase tracking-wider">{order.game_title || (order.disque_dur_option === 'fourni' ? 'Pack SolchDisk' : 'Installation Seule')}</h4>
                    {order.games_list && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {JSON.parse(order.games_list).map((gameTitle: string, idx: number) => (
                          <span key={idx} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5 text-muted">
                            {gameTitle}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-1">Commandé le {new Date(order.date_commande).toLocaleDateString()}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase text-muted">Preuve:</span>
                      <button 
                        onClick={() => {
                          const win = window.open("");
                          win?.document.write(`<img src="${order.preuve_paiement}" />`);
                        }}
                        className="text-[10px] text-neon-blue hover:underline uppercase"
                      >
                        Voir la capture
                      </button>
                    </div>
                  </div>
                  <div className="text-center md:text-right flex flex-col items-center md:items-end gap-3">
                    <span className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-display uppercase tracking-widest border",
                      order.statut === 'En attente' ? "bg-neon-red/10 border-neon-red/30 text-neon-red" :
                      order.statut === 'En cours' ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue" :
                      order.statut === 'Annulée' ? "bg-white/5 border-white/20 text-muted" :
                      "bg-neon-green/10 border-neon-green/30 text-neon-green"
                    )}>
                      {order.statut}
                    </span>
                    {order.statut === 'En attente' && (
                      <button 
                        onClick={() => cancelOrder(order.id)}
                        className="flex items-center gap-1 text-[10px] text-neon-red hover:underline uppercase tracking-tighter"
                      >
                        <Trash2 className="w-3 h-3" />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'games' | 'users'>('users');
  const [editingGame, setEditingGame] = useState<Partial<Game> | null>(null);
  const [gameImagePreview, setGameImagePreview] = useState<string | null>(null);

  const fetchData = () => {
    if (token) {
      axios.get('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } }).then(res => setOrders(res.data));
      axios.get('/api/games').then(res => setGames(res.data));
      axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).then(res => setUsers(res.data));
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const updateStatut = async (id: number, statut: string) => {
    await axios.patch(`/api/admin/orders/${id}`, { statut }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setOrders(orders.map(o => o.id === id ? { ...o, statut: statut as any } : o));
  };

  const handleGameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      titre: formData.get('titre') as string,
      description: formData.get('description') as string,
      prix: parseInt(formData.get('prix') as string) || 0,
      os: formData.get('os') as string,
      cpu: formData.get('cpu') as string,
      gpu: formData.get('gpu') as string,
      ram: formData.get('ram') as string,
      storage: formData.get('storage') as string,
      directx: formData.get('directx') as string,
      image: gameImagePreview || editingGame?.image || 'https://picsum.photos/seed/game/800/600'
    };

    try {
      console.log('Soumission du jeu:', data);
      if (editingGame?.id) {
        const response = await axios.put(`/api/games/${editingGame.id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Réponse modification:', response.data);
      } else {
        const response = await axios.post('/api/games', data, { headers: { Authorization: `Bearer ${token}` } });
        console.log('Réponse création:', response.data);
      }
      setEditingGame(null);
      setGameImagePreview(null);
      fetchData();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du jeu:', err);
      alert('Erreur lors de l\'enregistrement du jeu. Vérifiez la console pour plus de détails.');
    }
  };

  const deleteGame = async (id: number | string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce jeu ?')) return;
    try {
      console.log('Suppression du jeu:', id);
      const response = await axios.delete(`/api/games/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Réponse suppression:', response.data);
      fetchData();
    } catch (err) {
      console.error('Erreur suppression jeu:', err);
      alert('Erreur lors de la suppression du jeu');
    }
  };

  return (
    <div className="pt-32 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="flex flex-col lg:flex-row items-center justify-between mb-12 gap-6">
        <h2 className="text-3xl md:text-4xl font-black uppercase text-center lg:text-left">Admin <span className="text-neon-red">Panel</span></h2>
        <div className="flex flex-wrap justify-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("flex-1 lg:flex-none px-4 md:px-6 py-2 font-display text-[10px] md:text-sm uppercase tracking-widest border transition-all", activeTab === 'orders' ? "border-neon-red text-neon-red bg-neon-red/10" : "border-white/10 text-white/50")}
          >
            Commandes
          </button>
          <button 
            onClick={() => setActiveTab('games')}
            className={cn("px-4 md:px-6 py-2 font-display text-[10px] md:text-sm uppercase tracking-widest border transition-all", activeTab === 'games' ? "border-neon-red text-neon-red bg-neon-red/10" : "border-white/10 text-white/50")}
          >
            Jeux
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("flex-1 lg:flex-none px-4 md:px-6 py-2 font-display text-[10px] md:text-sm uppercase tracking-widest border transition-all", activeTab === 'users' ? "border-neon-red text-neon-red bg-neon-red/10" : "border-white/10 text-white/50")}
          >
            Utilisateurs ({users.length})
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-muted">
                <th className="pb-4 px-4">Client</th>
                <th className="pb-4 px-4">Localisation</th>
                <th className="pb-4 px-4">Jeu / Service</th>
                <th className="pb-4 px-4">Date</th>
                <th className="pb-4 px-4">Preuve</th>
                <th className="pb-4 px-4">Statut</th>
                <th className="pb-4 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map(order => (
                <tr key={order.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-6 px-4">
                    <p className="font-bold text-sm uppercase">{order.user_nom} {order.user_prenom}</p>
                    <p className="text-[10px] text-muted lowercase">{order.user_email}</p>
                    <p className="text-[10px] text-neon-green font-mono mt-1">{order.user_whatsapp}</p>
                  </td>
                  <td className="py-6 px-4">
                    <p className="text-[10px] uppercase tracking-wider">{order.user_ville}, {order.user_quartier}</p>
                    <p className="text-[9px] text-muted uppercase">{order.user_pays}</p>
                  </td>
                  <td className="py-6 px-4">
                    <p className="text-sm text-neon-blue uppercase font-bold">{order.game_title || (order.disque_dur_option === 'fourni' ? 'Pack SolchDisk' : 'Installation Seule')}</p>
                    {order.games_list && (
                      <div className="mt-2 flex flex-wrap gap-1 max-w-[200px]">
                        {JSON.parse(order.games_list).map((gameTitle: string, idx: number) => (
                          <span key={idx} className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-muted">
                            {gameTitle}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-muted uppercase">
                        Disque: {order.disque_dur_option === 'fourni' ? 'Fourni' : 'Client'}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 text-muted uppercase">
                        Livraison: {order.livraison_societe}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-xs text-muted">
                    {new Date(order.date_commande).toLocaleDateString()}
                  </td>
                  <td className="py-6 px-4">
                    <button 
                      onClick={() => {
                        const win = window.open("");
                        win?.document.write(`<img src="${order.preuve_paiement}" />`);
                      }}
                      className="text-[10px] text-neon-blue hover:underline uppercase"
                    >
                      Voir Capture
                    </button>
                  </td>
                  <td className="py-6 px-4">
                    <span className={cn(
                      "px-3 py-1 rounded-sm text-[9px] font-display uppercase tracking-widest border",
                      order.statut === 'En attente' ? "border-neon-red text-neon-red" :
                      order.statut === 'En cours' ? "border-neon-blue text-neon-blue" :
                      order.statut === 'Annulée' ? "border-white/20 text-muted" :
                      "border-neon-green text-neon-green"
                    )}>
                      {order.statut}
                    </span>
                  </td>
                  <td className="py-6 px-4">
                    <select 
                      value={order.statut}
                      onChange={(e) => updateStatut(order.id, e.target.value)}
                      className="bg-dark-card border border-white/10 text-xs p-2 outline-none focus:border-neon-red"
                    >
                      <option value="En attente">En attente</option>
                      <option value="En cours">En cours</option>
                      <option value="Livrée">Livrée</option>
                      <option value="Annulée">Annulée</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-muted">
                <th className="pb-4 px-4">Utilisateur</th>
                <th className="pb-4 px-4">Contact</th>
                <th className="pb-4 px-4">Localisation</th>
                <th className="pb-4 px-4">Rôle</th>
                <th className="pb-4 px-4">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-6 px-4">
                    <p className="font-bold text-sm uppercase">{u.nom} {u.prenom}</p>
                    <p className="text-[10px] text-muted lowercase">{u.email}</p>
                  </td>
                  <td className="py-6 px-4">
                    <p className="text-xs text-neon-green font-mono">{u.whatsapp || 'Non renseigné'}</p>
                  </td>
                  <td className="py-6 px-4">
                    <p className="text-[10px] uppercase tracking-wider">{u.ville || '?'}, {u.quartier || '?'}</p>
                    <p className="text-[9px] text-muted uppercase">{u.pays || '?'}</p>
                  </td>
                  <td className="py-6 px-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-sm text-[9px] font-display uppercase tracking-widest border",
                      u.role === 'admin' ? "border-neon-red text-neon-red" : "border-white/20 text-muted"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-6 px-4 text-xs text-muted">
                    {u.date_creation ? new Date(u.date_creation).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'games' && (
        <div className="space-y-12">
          <div className="flex justify-end">
            <button 
              onClick={() => { setEditingGame({}); setGameImagePreview(null); }}
              className="btn-neon btn-neon-green flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter un Jeu
            </button>
          </div>

          {editingGame && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card border border-neon-red/30 p-8 rounded-sm"
            >
              <h3 className="text-xl font-bold uppercase mb-8">{editingGame.id ? 'Modifier' : 'Ajouter'} un Jeu</h3>
              <form onSubmit={handleGameSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase text-muted mb-2">Titre</label>
                    <input name="titre" defaultValue={editingGame.titre} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase text-muted mb-2">Description</label>
                    <textarea name="description" defaultValue={editingGame.description} required rows={3} className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red resize-none text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">Prix (FCFA)</label>
                    <input name="prix" type="number" defaultValue={editingGame.prix} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">Système d'Exploitation</label>
                    <input name="os" defaultValue={editingGame.os} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">CPU</label>
                    <input name="cpu" defaultValue={editingGame.cpu} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">GPU</label>
                    <input name="gpu" defaultValue={editingGame.gpu} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">RAM</label>
                    <input name="ram" defaultValue={editingGame.ram} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted mb-2">Stockage</label>
                    <input name="storage" defaultValue={editingGame.storage} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase text-muted mb-2">DirectX</label>
                    <input name="directx" defaultValue={editingGame.directx} required className="w-full bg-input border border-white/10 p-3 rounded-sm outline-none focus:border-neon-red text-primary" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <label className="block text-[10px] uppercase text-muted mb-2">Image du Jeu</label>
                  <div className="relative group aspect-video">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setGameImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full h-full bg-white/5 border border-dashed border-white/20 rounded-sm flex flex-col items-center justify-center group-hover:border-neon-red transition-all overflow-hidden">
                      {(gameImagePreview || editingGame.image) ? (
                        <img src={gameImagePreview || editingGame.image} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted mb-2" />
                          <span className="text-[10px] uppercase text-muted">Uploader Photo</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setEditingGame(null)} className="btn-neon btn-neon-outline flex-1">Annuler</button>
                    <button type="submit" className="btn-neon bg-neon-red text-white hover:bg-white hover:text-black flex-1">Enregistrer</button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map(game => (
              <div key={game.id} className="bg-dark-card border border-white/5 p-6 rounded-sm flex gap-6 items-center">
                <img src={game.image} className="w-16 h-16 object-cover rounded-sm" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold uppercase truncate text-sm">{game.titre}</h4>
                  <p className="text-neon-green text-xs font-display">{game.prix.toLocaleString()} FCFA</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingGame(game); setGameImagePreview(null); }} className="p-2 text-white/30 hover:text-neon-blue transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteGame(game.id)} className="p-2 text-white/30 hover:text-neon-red transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---
// --- Background Slider ---
const BackgroundSlider = () => {
  const images = [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920&auto=format&fit=crop"
  ];
  
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000); // 8 seconds per image for a slow, discrete transition
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-[-10] overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img 
            src={images[index]} 
            alt="Gaming Background" 
            className="w-full h-full object-cover opacity-75 grayscale-[0.1] brightness-[0.75]"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>
      {/* Dark Overlay with subtle color tint and blur */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/70 via-dark-bg/50 to-dark-bg/75 backdrop-blur-[1px]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.2)_100%)]"></div>
    </div>
  );
};

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('cart'); // Ensure fresh cart on login
    setAuthState({ token, user, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart'); // Clear cart on logout
    setAuthState({ token: null, user: null, isAuthenticated: false });
  };

  const { isAuthenticated, user } = authState;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ ...authState, login, logout }}>
        <Router>
          <div className="min-h-screen flex flex-col selection:bg-neon-green selection:text-black relative">
            <BackgroundSlider />
            <Navbar />
            <main className="flex-grow">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalogue" element={<Catalogue />} />
                  <Route path="/jeu/:id" element={<GameDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/cart" element={isAuthenticated && user?.role === 'client' ? <Cart /> : <Login />} />
                  <Route path="/profile" element={isAuthenticated ? <Profile /> : <Login />} />
                  <Route path="/admin" element={isAuthenticated && user?.role === 'admin' ? <AdminDashboard /> : <Login />} />
                  <Route path="/about" element={
                    <div className="pt-28 md:pt-40 max-w-4xl mx-auto px-6 text-center pb-20">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        <h2 className="text-3xl md:text-5xl font-black uppercase mb-8 leading-tight">À Propos de <span className="text-neon-green">SolchDisk Gaming</span></h2>
                        <div className="space-y-8 text-secondary leading-relaxed text-sm md:text-lg text-justify md:text-center">
                          <p>
                            SolchDisk Gaming est né de la passion pour le gaming pur et immersif. Nous croyons que chaque joueur mérite une expérience fluide et complète, de l’achat à l’installation des jeux.
                          </p>
                          <p>
                            Basés en Côte d’Ivoire, nous nous engageons à faciliter l’accès aux derniers titres PC grâce à des solutions simples et sécurisées. Que vous choisissiez nos disques durs gaming préchargés ou l’installation sur votre propre disque, notre objectif est de vous offrir une expérience gaming optimale dès le premier instant.
                          </p>
                          <p>
                            Nous utilisons des méthodes de paiement locales, telles que MTN Mobile Money, Moov Money et Wave, pour rendre les transactions rapides et sûres. Notre service logistique, en partenariat avec des sociétés fiables comme Yango et Waren, garantit une livraison efficace dans toute la sous-région : Ghana, Mali, Burkina Faso, Sénégal, Bénin et Togo.
                          </p>
                          <p>
                            Chez SolchDisk Gaming, nous ne vendons pas seulement des jeux : nous offrons la tranquillité d’esprit, la qualité et le plaisir de jouer, tout en restant proches de notre communauté de gamers et en répondant à leurs besoins avec passion et professionnalisme.
                          </p>
                          
                          <div className="pt-10 border-t border-white/10">
                            <h3 className="text-xl font-bold uppercase text-neon-red mb-4">Politique de Remboursement</h3>
                            <p className="text-xs md:text-sm text-muted italic">
                              En cas d'annulation d'une commande en attente, le remboursement est traité dans un délai de 3 jours ouvrables. Notre équipe s'engage à traiter chaque demande avec le plus grand soin.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  } />
                  <Route path="/contact" element={
                    <div className="pt-28 md:pt-40 max-w-6xl mx-auto px-6 pb-20">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <h2 className="text-3xl md:text-5xl font-black uppercase mb-12 text-center">Contactez <span className="text-neon-blue">L'Équipe</span></h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                          <div className="lg:col-span-1 space-y-6 md:space-y-8">
                            <div className="bg-dark-card p-6 md:p-8 border border-white/5 rounded-sm hover:border-neon-blue transition-all group">
                              <a href="mailto:Soppysolch002@gmail.com" className="block">
                                <Mail className="w-8 h-8 text-neon-blue mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold uppercase mb-2">Email</h4>
                                <p className="text-muted text-xs md:text-sm hover:text-neon-blue transition-colors break-all">Soppysolch002@gmail.com</p>
                              </a>
                            </div>
                            <div className="bg-dark-card p-6 md:p-8 border border-white/5 rounded-sm hover:border-neon-green transition-all group">
                              <a href="https://wa.me/2250143407801" target="_blank" rel="noopener noreferrer" className="block">
                                <Info className="w-8 h-8 text-neon-green mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold uppercase mb-2">Support</h4>
                                <p className="text-muted text-xs italic mb-1">Disponible 24/7 via WhatsApp</p>
                                <p className="text-muted text-xs md:text-sm hover:text-neon-green transition-colors">Whatsapp : +225 01 43 40 78 01</p>
                              </a>
                            </div>
                            <div className="bg-dark-card p-6 md:p-8 border border-white/5 rounded-sm hover:border-neon-red transition-all group">
                              <a href="https://www.google.com/maps/place/5%C2%B020'19.4%22N+4%C2%B006'49.6%22W/@5.3387243,-4.1163603,654m/data=!3m2!1e3!4b1!4m4!3m3!8m2!3d5.3387243!4d-4.1137854?hl=fr&entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" className="block">
                                <MapPin className="w-8 h-8 text-neon-red mb-4 group-hover:scale-110 transition-transform" />
                                <h4 className="font-bold uppercase mb-2">Localisation</h4>
                                <p className="text-muted text-xs italic mb-1">Abidjan, Côte d'Ivoire</p>
                                <p className="text-muted text-xs md:text-sm hover:text-neon-red transition-colors">Voir sur Google Maps</p>
                              </a>
                            </div>
                          </div>
                          
                          <div className="lg:col-span-2">
                            <form 
                              action="https://formspree.io/f/xlgpgyzb"
                              method="POST"
                              className="bg-dark-card p-6 md:p-10 border border-white/10 rounded-sm space-y-6"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-[10px] font-display uppercase tracking-widest text-muted mb-2">Nom</label>
                                  <input name="name" required className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-display uppercase tracking-widest text-muted mb-2">Email</label>
                                  <input name="email" type="email" required className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-display uppercase tracking-widest text-muted mb-2">Sujet</label>
                                <input name="subject" required className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all text-primary" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-display uppercase tracking-widest text-muted mb-2">Message</label>
                                <textarea name="message" rows={5} required className="w-full bg-input border border-white/10 rounded-sm py-3 px-4 focus:border-neon-blue outline-none transition-all resize-none text-primary"></textarea>
                              </div>
                              <button type="submit" className="btn-neon bg-neon-blue text-black hover:bg-white hover:shadow-[0_0_20px_#00F0FF] py-4 w-full font-bold">
                                Envoyer le Message
                              </button>
                            </form>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  } />
                </Routes>
              </AnimatePresence>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// End of file
