/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  Home, 
  Stethoscope, 
  Utensils, 
  Dog, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  TrendingUp,
  Share2,
  Smile,
  Users,
  MapPin,
  Calendar,
  LogOut,
  LogIn,
  X,
  Clock,
  Navigation,
  ImagePlus,
  Upload,
  Sparkles,
  Quote,
  Search,
  MessageSquare,
  Send,
  Trash2,
  Shield,
  ShieldCheck,
  Mail
} from "lucide-react";
import { auth } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { firestoreService } from './lib/firestoreService';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper to center map when location changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// Types
interface Shelter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  distance?: number;
  imageUrl?: string;
}

interface Story {
  id: string;
  userId: string;
  userName?: string;
  dogName: string;
  storyText: string;
  imageUrl: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  shelterId: string;
  shelterName: string;
  message: string;
  createdAt: string;
}

interface Appointment {
  id: string;
  shelterId: string;
  date: string;
  status: string;
  notes?: string;
}

const Section = ({ title, icon: Icon, children, className = "" }: { title: string; icon?: any; children: React.ReactNode; className?: string }) => (
  <motion.section 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`mb-12 ${className}`}
  >
    <div className="flex items-center gap-3 mb-6">
      {Icon && <Icon className="w-8 h-8 text-orange-600" />}
      <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stories, setStories] = useState<Story[]>([]);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [newStory, setNewStory] = useState({ dogName: "", storyText: "" });
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isShelterRegisterOpen, setIsShelterRegisterOpen] = useState(false);
  const [newShelter, setNewShelter] = useState({ name: "", address: "", lat: "", lng: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState<number>(100); // Default 100km

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await firestoreService.saveUser(currentUser);
        fetchAppointments(currentUser.uid);
        const isAdminUser = currentUser.email === 'knososarmagedoneli@gmail.com';
        setIsAdmin(isAdminUser);
        if (isAdminUser) {
          fetchAllMessages();
        }
      } else {
        setAppointments([]);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Data
  useEffect(() => {
    fetchShelters();
    fetchStories();
    detectLocation();
  }, []);

  const fetchAllMessages = async () => {
    const data = await firestoreService.getAllMessages();
    if (data) setAllMessages(data as Message[]);
  };

  const fetchShelters = async () => {
    const data = await firestoreService.getShelters();
    if (data) setShelters(data as Shelter[]);
  };

  const fetchStories = async () => {
    const data = await firestoreService.getStories();
    if (data) setStories(data as Story[]);
  };

  const fetchAppointments = async (uid: string) => {
    const data = await firestoreService.getUserAppointments(uid);
    if (data) setAppointments(data as Appointment[]);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, (error) => {
        console.error("Location error:", error);
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredShelters = shelters
    .map(s => {
      if (userLocation) {
        return { ...s, distance: calculateDistance(userLocation.lat, userLocation.lng, s.latitude, s.longitude) };
      }
      return s;
    })
    .filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const withinDistance = userLocation && s.distance ? s.distance <= maxDistance : true;
      
      return matchesSearch && withinDistance;
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleBookAppointment = async () => {
    if (!user || !selectedShelter) return;
    
    const dateTime = `${bookingDate}T${bookingTime}`;
    try {
      await firestoreService.createAppointment({
        userId: user.uid,
        shelterId: selectedShelter.id,
        date: dateTime,
        notes: bookingNotes,
        status: 'pending'
      });
      setIsBookingModalOpen(false);
      fetchAppointments(user.uid);
      alert("შეხვედრა წარმატებით დაიჯავშნა!");
    } catch (error) {
      alert("შეცდომა დაჯავშნისას. სცადეთ მოგვიანებით.");
    }
  };

  const handleRegisterShelter = async () => {
    if (!user) return;
    setIsUploading(true);
    try {
      let imageUrl = "";
      if (selectedFile) {
        imageUrl = await firestoreService.uploadImage(selectedFile) || "";
      }

      await firestoreService.createShelter({
        name: newShelter.name,
        address: newShelter.address,
        latitude: parseFloat(newShelter.lat),
        longitude: parseFloat(newShelter.lng),
        imageUrl: imageUrl
      });
      setIsShelterRegisterOpen(false);
      setNewShelter({ name: "", address: "", lat: "", lng: "" });
      setSelectedFile(null);
      fetchShelters();
      alert("თავშესაფარი წარმატებით დარეგისტრირდა!");
    } catch (error) {
      console.error(error);
      alert("შეცდომა რეგისტრაციისას. დარწმუნდით რომ მონაცემები სწორია.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleShareStory = async () => {
    if (!user || !storyFile) return;
    setIsUploading(true);
    try {
      const imageUrl = await firestoreService.uploadImage(storyFile, 'stories') || "";
      await firestoreService.createStory({
        userId: user.uid,
        userName: user.displayName,
        dogName: newStory.dogName,
        storyText: newStory.storyText,
        imageUrl: imageUrl
      });
      setIsStoryModalOpen(false);
      setNewStory({ dogName: "", storyText: "" });
      setStoryFile(null);
      fetchStories();
      alert("თქვენი ისტორია წარმატებით გაზიარდა! მადლობა!");
    } catch (error) {
      console.error(error);
      alert("შეცდომა გაზიარებისას.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedShelter || !contactMessage) return;
    setIsSending(true);
    try {
      await firestoreService.sendMessage({
        senderId: user.uid,
        senderName: user.displayName || "მომხმარებელი",
        senderEmail: user.email,
        shelterId: selectedShelter.id,
        shelterName: selectedShelter.name,
        message: contactMessage
      });
      setIsContactModalOpen(false);
      setContactMessage("");
      alert("შეტყობინება წარმატებით გაიგზავნა!");
    } catch (error) {
      console.error(error);
      alert("შეცდომა გაგზავნისას.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) return;
    try {
      await firestoreService.deleteMessage(id);
      fetchAllMessages();
    } catch (error) {
      alert("შეცდომა წაშლისას");
    }
  };

  const handleDeleteShelter = async (id: string) => {
    if (!window.confirm("დარწმუნებული ხართ რომ გსურთ თავშესაფრის წაშლა?")) return;
    try {
      await firestoreService.deleteShelter(id);
      fetchShelters();
    } catch (error) {
      alert("შეცდომა წაშლისას");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl text-orange-600">
            <Dog className="w-6 h-6" />
            <span>ADOPT.GE</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-900">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[10px] text-gray-400 hover:text-red-500 uppercase tracking-widest font-bold">გამოსვლა</button>
                </div>
                <img src={user.photoURL || ""} alt="" className="w-8 h-8 rounded-full border border-gray-200" />
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                შესვლა
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-orange-50 overflow-hidden pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Dog className="w-16 h-16 mx-auto text-orange-600 mb-6" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight"
          >
            იშვილე მეგობარი, <br/>შექმენი ისტორია
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            ძაღლის აყვანა მხოლოდ შინაური ცხოველის შეძენა არ არის — ეს არის სიცოცხლის გადარჩენა და უპირობო სიყვარულის დასაწყისი.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <span className="inline-block bg-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-orange-700 transition-colors cursor-pointer">
              ნუ იყიდი, იშვილე!
            </span>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-300 rounded-full blur-3xl opacity-20 -ml-32 -mb-32" />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        
        {/* Map Section */}
        <Section title="თავშესაფრები რუკაზე" icon={Navigation}>
          {/* Filters UI */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <input 
                type="text" 
                placeholder="ძიება სახელით ან მისამართით..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {userLocation && (
              <div className="flex items-center gap-4 bg-white border border-gray-200 p-3 rounded-2xl shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">რადიუსი: {maxDistance} კმ</span>
                <input 
                  type="range" 
                  min="1" 
                  max="200" 
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                  className="w-full accent-orange-600"
                />
              </div>
            )}
          </div>

          <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-gray-200 shadow-sm z-0">
            <MapContainer 
              center={userLocation ? [userLocation.lat, userLocation.lng] : [41.7151, 44.8271]} 
              zoom={12} 
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {userLocation && (
                <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={12} />
              )}
              {filteredShelters.map((shelter) => (
                <Marker 
                  key={shelter.id} 
                  position={[shelter.latitude, shelter.longitude]}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      {shelter.imageUrl && (
                        <img src={shelter.imageUrl} alt={shelter.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                      )}
                      <h3 className="font-bold text-gray-900 mb-1">{shelter.name}</h3>
                      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {shelter.address}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                          onClick={() => {
                            if (!user) {
                              handleLogin();
                            } else {
                              setSelectedShelter(shelter);
                              setIsBookingModalOpen(true);
                            }
                          }}
                          className="py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors"
                        >
                          დაჯავშნა
                        </button>
                        <button 
                          onClick={() => {
                            if (!user) {
                              handleLogin();
                            } else {
                              setSelectedShelter(shelter);
                              setIsContactModalOpen(true);
                            }
                          }}
                          className="py-2 bg-orange-600 text-white rounded-lg text-[10px] font-bold hover:bg-orange-700 transition-colors"
                        >
                          კონტაქტი
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Section>

        {/* 1. Near You - Shelters */}
        <Section title="თავშესაფრები შენს გარშემო" icon={MapPin}>
          <div className="flex justify-between items-center mb-6">
            {!userLocation && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-900">გააქტიურეთ ლოკაცია უახლოესი თავშესაფრების საპოვნელად.</p>
              </div>
            )}
            <button 
              onClick={() => user ? setIsShelterRegisterOpen(true) : handleLogin()}
              className="ml-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm shadow-sm"
            >
              <Home className="w-4 h-4" /> თავშესაფრის რეგისტრაცია
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShelters.length > 0 ? (
              filteredShelters.map((shelter) => (
                <Card key={shelter.id} className="relative overflow-hidden group !p-0">
                  <div className="h-40 bg-gray-100 overflow-hidden relative">
                    {shelter.imageUrl ? (
                      <img src={shelter.imageUrl} alt={shelter.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Home className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity z-10">
                      <Home className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-6 pt-4">
                    <h3 className="font-bold text-xl mb-1 text-gray-900">{shelter.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {shelter.address}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      {shelter.distance !== undefined && (
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-md">
                          {shelter.distance.toFixed(1)} კმ მოშორებით
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          if (!user) {
                            handleLogin();
                          } else {
                            setSelectedShelter(shelter);
                            setIsBookingModalOpen(true);
                          }
                        }}
                        className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Calendar className="w-4 h-4" /> დაჯავშნა
                      </button>
                      <button 
                        onClick={() => {
                          if (!user) {
                            handleLogin();
                          } else {
                            setSelectedShelter(shelter);
                            setIsContactModalOpen(true);
                          }
                        }}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" /> კონტაქტი
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                          onClick={() => handleDeleteShelter(shelter.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> თავშესაფრის წაშლა (Admin)
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-3xl">
                თავშესაფრები ვერ მოიძებნა...
              </div>
            )}
          </div>
        </Section>

        {/* Admin Panel */}
        {isAdmin && (
          <Section title="ადმინ პანელი - შეტყობინებები" icon={Shield}>
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">გამომგზავნი</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">ადრესატი</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">შეტყობინება</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">თარიღი</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{msg.senderName}</p>
                          <p className="text-xs text-gray-400">{msg.senderEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{msg.shelterName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-400">{format(new Date(msg.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allMessages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">შეტყობინებები არ არის</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* Support Section for Shelters */}
        <Section title="გახდი ჩვენი პარტნიორი" icon={ShieldCheck}>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative shadow-xl">
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-3xl font-black mb-4">თქვენ ფლობთ თავშესაფარს?</h3>
              <p className="text-blue-100 text-lg mb-8">დაგვიკავშირდით და დაამატეთ თქვენი თავშესაფარი ჩვენს პლატფორმაზე, რათა მეტმა ადამიანმა შეძლოს თქვენი ბინადრების გაცნობა და დახმარება.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => handleLogin()}
                  className="bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" /> რეგისტრაცია
                </button>
                <div className="flex items-center gap-2 text-blue-100 px-6 py-4">
                  <Mail className="w-5 h-5" /> help@petconnect.ge
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 opacity-20">
              <ShieldCheck className="w-96 h-96" />
            </div>
          </div>
        </Section>

        {/* Adopted Dogs Gallery */}
        <Section title="ბედნიერი ისტორიების გალერეა" icon={Sparkles}>
          <div className="bg-orange-50 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-orange-100">
            <div className="max-w-xl">
              <h3 className="text-2xl font-black text-gray-900 mb-2">გაგვიზიარეთ თქვენი ბედნიერება!</h3>
              <p className="text-gray-600">თქვენმა ისტორიამ შეიძლება სხვასაც შთააგონოს მეგობრის აყვანა. ატვირთეთ ფოტო და მოგვიყევით თქვენი თავგადასავალი.</p>
            </div>
            <button 
              onClick={() => user ? setIsStoryModalOpen(true) : handleLogin()}
              className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" /> ისტორიის გაზიარება
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.length > 0 ? (
              stories.map((story) => (
                <motion.div 
                  key={story.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col"
                >
                  <div className="h-64 overflow-hidden relative">
                    <img 
                      src={story.imageUrl} 
                      alt={story.dogName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-orange-600 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-current" /> {story.dogName}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="mb-4">
                      <Quote className="w-6 h-6 text-orange-100 mb-2" />
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 italic">
                        {story.storyText}
                      </p>
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                        {story.userName?.[0] || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{story.userName || "მომხმარებელი"}</span>
                        <span className="text-[10px] text-gray-400 capitalize">{format(new Date(story.createdAt), 'MMMM yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">ჯერ არცერთი ისტორია არ გაზიარებულა. იყავით პირველი!</p>
              </div>
            )}
          </div>
        </Section>

        {/* User Appointments */}
        {user && appointments.length > 0 && (
          <Section title="ჩემი დაჯავშნილი შეხვედრები" icon={Clock}>
            <div className="space-y-4">
              {appointments.map((app) => {
                const shelter = shelters.find(s => s.id === app.shelterId);
                return (
                  <div key={app.id} className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${app.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{shelter?.name || "თავშესაფარი"}</h4>
                        <p className="text-sm text-gray-500">{format(new Date(app.date), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${
                        app.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                        app.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {app.status === 'pending' ? 'მოლოდინში' : app.status === 'confirmed' ? 'დადასტურებულია' : 'გაუქმებულია'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* 1. Benefits */}
        <Section title="რატომ უნდა ავირჩიოთ აყვანა?" icon={Heart}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> სიცოცხლის გადარჩენა
              </h3>
              <p className="text-gray-600">საქართველოში, უსახლკარო ცხოველების კატასტროფული სიმრავლის გამო, თავშესაფრებში ხშირად ადგილი არ არის, რაც სამწუხაროდ ბევრი ძაღლის ლიკვიდაციის (დაძინების) მიზეზი ხდება. შენი არჩევანი პირდაპირ ნიშნავს ერთი სიცოცხლის გადარჩენას და სხვა გადარჩენილისთვის ადგილის გამოთავისუფლებას.</p>
            </Card>
            <Card>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> ჯანმრთელობა და ხასიათი
              </h3>
              <p className="text-gray-600">ბევრ თავშესაფრის ძაღლს უკვე გავლილი აქვს ვეტერინარული შემოწმება და ვაქცინაცია. ასევე, ხშირად მათი ხასიათი უკვე ჩამოყალიბებულია, რაც არჩევანს აადვილებს.</p>
            </Card>
            <Card>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> ბრძოლა არაეთიკურ ბიზნესთან
              </h3>
              <p className="text-gray-600">აყვანით შენ უარს ამბობ „ლეკვების ფაბრიკების“ მხარდაჭერაზე, სადაც ცხოველებს ხშირად გაუსაძლის პირობებში ამრავლებენ გასაყიდად.</p>
            </Card>
            <Card>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> ერთგულების უმაღლესი დონე
              </h3>
              <p className="text-gray-600">გადარჩენილი ძაღლები განსაკუთრებულ მადლიერებასა და ერთგულებას იჩენენ თავიანთი ახალი პატრონების მიმართ.</p>
            </Card>
          </div>
        </Section>

        {/* 2. How to choose */}
        <Section title="როგორ შევარჩიოთ სწორი მეგობარი?" icon={Dog}>
          <div className="bg-white rounded-2xl p-8 border border-gray-100 mb-8">
            <p className="text-lg text-gray-700 mb-6 font-medium">დაფიქრდით შემდეგ ფაქტორებზე:</p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-orange-100 p-3 rounded-xl h-fit">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">აქტივობის დონე</h4>
                  <p className="text-gray-600">თუ სპორტული ხართ, აქტიური ძაღლი საუკეთესო კომპანიონი იქნება. თუ სიმშვიდე გიყვართ, უფროსი ასაკის ძაღლი უფრო მოგიხდებათ.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-orange-100 p-3 rounded-xl h-fit">
                  <Home className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">საცხოვრებელი ადგილი</h4>
                  <p className="text-gray-600">ბინის პირობებში პატარა ან საშუალო ზომის, მშვიდი ძაღლები უფრო კომფორტულად გრძნობენ თავს, კერძო სახლისთვის კი დიდი სივრცე ბევრ შესაძლებლობას იძლევა.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-orange-100 p-3 rounded-xl h-fit">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">გამოცდილება</h4>
                  <p className="text-gray-600">ზოგიერთ ჯიშს ან ინდივიდს გამოცდილი პატრონი და სპეციფიკური წვრთნა სჭირდება. პირველი ძაღლისთვის უმჯობესია შედარებით დამყოლი ხასიათის მქონე შეარჩიოთ.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 3. Responsibilities */}
        <Section title="ძაღლის პატრონის მოვალეობები" icon={Info}>
          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="text-center">
              <Utensils className="w-10 h-10 mx-auto text-orange-500 mb-4" />
              <h4 className="font-bold mb-2">კვება</h4>
              <p className="text-sm text-gray-600">დაბალანსებული რაციონი და სუფთა წყალი მუდმივად ხელმისაწვდომი უნდა იყოს.</p>
            </Card>
            <Card className="text-center">
              <Stethoscope className="w-10 h-10 mx-auto text-blue-500 mb-4" />
              <h4 className="font-bold mb-2">ჯანმრთელობა</h4>
              <p className="text-sm text-gray-600">რეგულარული ვიზიტები ვეტერინართან, ვაქცინაცია და პარაზიტებისგან დაცვა.</p>
            </Card>
            <Card className="text-center">
              <Smile className="w-10 h-10 mx-auto text-yellow-500 mb-4" />
              <h4 className="font-bold mb-2">წვრთნა და სოციალიზაცია</h4>
              <p className="text-sm text-gray-600">ელემენტარული ბრძანებების სწავლება და სხვა ცხოველებთან ურთიერთობის გამოცდილება.</p>
            </Card>
          </div>
        </Section>

        {/* 4. Tips for first-time adopters */}
        <Section title="რჩევები დამწყებთათვის">
          <div className="bg-gray-900 text-white rounded-3xl p-8 md:p-12 overflow-hidden relative">
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">მოემზადე სახლში მისაღებად</h3>
                <ul className="space-y-3 opacity-90">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">•</span>
                    იყავით მომთმენი: ძაღლს ახალ გარემოსთან შესაჩვევად 3 დღე, 3 კვირა ან 3 თვე შეიძლება დასჭირდეს.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">•</span>
                    დააწესეთ რუტინა: ჭამა, გასეირნება და ძილი ერთსა და იმავე დროს დაეხმარება მას თავი დაცულად იგრძნოს.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">•</span>
                    მოამზადეთ საჭირო ნივთები: საყელო, საბელი, საწოლი, ჯამები და სათამაშოები წინასწარ დაახვედრეთ.
                  </li>
                </ul>
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-gray-800 rounded-full flex items-center justify-center border-4 border-orange-500/30">
                  <Dog className="w-24 h-24 text-orange-500" />
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
          </div>
        </Section>

        {/* Booking Modal */}
        <AnimatePresence>
          {isBookingModalOpen && selectedShelter && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsBookingModalOpen(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900">შეხვედრის დაჯავშნა</h3>
                    <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p className="text-sm font-bold text-orange-800 uppercase tracking-widest mb-1">თავშესაფარი</p>
                    <p className="text-xl font-bold text-gray-900">{selectedShelter.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {selectedShelter.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">თარიღი</label>
                      <input 
                        type="date" 
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">დრო</label>
                      <input 
                        type="time" 
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">შენიშვნა (სურვილისამებრ)</label>
                    <textarea 
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="მაგ: მინდა კონკრეტულ ძაღლთან შეხვედრა..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all h-24 resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleBookAppointment}
                    disabled={!bookingDate || !bookingTime}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-200"
                  >
                    დაჯავშნა
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Contact Modal */}
        <AnimatePresence>
          {isContactModalOpen && selectedShelter && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsContactModalOpen(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900">კონტაქტი</h3>
                    <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-1">ადრესატი</p>
                    <p className="text-xl font-bold text-gray-900">{selectedShelter.name}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {selectedShelter.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">გამომგზავნი</label>
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.displayName}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ელ-ფოსტა</label>
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="mb-8">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">შეტყობინება</label>
                    <textarea 
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="დაწერეთ თქვენი შეკითხვა აქ..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all h-40 resize-none"
                    />
                  </div>

                  <button 
                    onClick={handleSendMessage}
                    disabled={!contactMessage || isSending}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <Upload className="w-5 h-5 animate-bounce" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    გაგზავნა
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Story Submission Modal */}
        <AnimatePresence>
          {isStoryModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsStoryModalOpen(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900">ისტორიის გაზიარება</h3>
                    <button onClick={() => setIsStoryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ძაღლის სახელი</label>
                      <input 
                        type="text" 
                        value={newStory.dogName}
                        onChange={(e) => setNewStory({...newStory, dogName: e.target.value})}
                        placeholder="მაგ: ბობი"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">მოგვიყევით თქვენი ისტორია</label>
                      <textarea 
                        value={newStory.storyText}
                        onChange={(e) => setNewStory({...newStory, storyText: e.target.value})}
                        placeholder="როგორ შევხვდით, როგორ შეიცვალა თქვენი ცხოვრება..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all h-32 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">საყვარელი ფოტო</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {storyFile ? (
                            <div className="text-center">
                              <p className="text-sm font-bold text-orange-600">{storyFile.name}</p>
                              <p className="text-xs text-gray-400">ფოტო შერჩეულია</p>
                            </div>
                          ) : (
                            <>
                              <ImagePlus className="w-8 h-8 text-gray-300 mb-2" />
                              <p className="text-xs text-gray-400 uppercase font-bold">აირჩიეთ ფოტო</p>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => setStoryFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={handleShareStory}
                    disabled={!newStory.dogName || !newStory.storyText || !storyFile || isUploading}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Upload className="w-5 h-5 animate-bounce" />
                        ზიარდება...
                      </>
                    ) : (
                      "გაზიარება"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shelter Registration Modal */}
        <AnimatePresence>
          {isShelterRegisterOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShelterRegisterOpen(false)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900">თავშესაფრის რეგისტრაცია</h3>
                    <button onClick={() => setIsShelterRegisterOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">სახელი</label>
                      <input 
                        type="text" 
                        value={newShelter.name}
                        onChange={(e) => setNewShelter({...newShelter, name: e.target.value})}
                        placeholder="მაგ: თბილისის მუნიციპალური თავშესაფარი"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">მისამართი</label>
                      <input 
                        type="text" 
                        value={newShelter.address}
                        onChange={(e) => setNewShelter({...newShelter, address: e.target.value})}
                        placeholder="მაგ: აეროპორტის ტრასა, თბილისი"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">განედი (Latitude)</label>
                        <input 
                          type="number" 
                          step="any"
                          value={newShelter.lat}
                          onChange={(e) => setNewShelter({...newShelter, lat: e.target.value})}
                          placeholder="41.7151"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">გრძედი (Longitude)</label>
                        <input 
                          type="number" 
                          step="any"
                          value={newShelter.lng}
                          onChange={(e) => setNewShelter({...newShelter, lng: e.target.value})}
                          placeholder="44.8271"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ფოტო</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {selectedFile ? (
                            <div className="text-center">
                              <p className="text-sm font-bold text-orange-600">{selectedFile.name}</p>
                              <p className="text-xs text-gray-400">ფაილი შერჩეულია</p>
                            </div>
                          ) : (
                            <>
                              <ImagePlus className="w-8 h-8 text-gray-300 mb-2" />
                              <p className="text-xs text-gray-400 uppercase font-bold">აირჩიეთ ფაილი</p>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  </div>

                  <button 
                    onClick={handleRegisterShelter}
                    disabled={!newShelter.name || !newShelter.address || !newShelter.lat || !newShelter.lng || isUploading}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Upload className="w-5 h-5 animate-bounce" />
                        იტვირთება...
                      </>
                    ) : (
                      "დამატება"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 5. Emotional Impact */}
        <Section title="ემოციური და სოციალური გავლენა" icon={Users}>
          <Card className="bg-gradient-to-br from-orange-50 to-white">
            <p className="text-lg leading-relaxed text-gray-700 italic">
              „ძაღლის აყვანა ცვლის არა მხოლოდ მის სამყაროს, არამედ თქვენსასაც. ის გვასწავლის პასუხისმგებლობას, თანაგრძნობას და გვეხმარება სტრესთან გამკლავებაში. ბევრი კვლევა ადასტურებს, რომ ძაღლის ყოლა აუმჯობესებს ფსიქიკურ ჯანმრთელობას და გვეხმარება ახალი ადამიანების გაცნობაში სეირნობისას.“
            </p>
          </Card>
        </Section>

        {/* 6. Common Mistakes */}
        <Section title="გავრცელებული შეცდომები" icon={AlertCircle}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-gray-800">იმპულსური გადაწყვეტილება მხოლოდ გარეგნობის საფუძველზე.</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-gray-800">ფინანსური ხარჯების (საკვები, ვეტერინარი) არასწორი შეფასება.</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-gray-800">სახლში მარტო დატოვების ხანგრძლივობის გაუთვალისწინებლობა.</p>
            </div>
          </div>
        </Section>

        {/* Social Media Section */}
        <div className="mt-20 pt-10 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <Share2 className="w-6 h-6 text-gray-400" />
            <h3 className="text-xl font-bold uppercase tracking-widest text-gray-400">კამპანიის იდეები სოციალური მედიისთვის</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border-l-4 border-orange-500 pl-6">
              <h4 className="font-bold text-lg mb-2">#AdoptDontShop გამოწვევა</h4>
              <p className="text-gray-600 text-sm">გააზიარეთ თქვენი აყვანილი ძაღლის ფოტო „მანამდე და მერე“, რათა სხვებსაც აჩვენოთ, როგორ იცვლებიან ცხოველები სიყვარულით.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-6">
              <h4 className="font-bold text-lg mb-2">მოხალისეობის დღე</h4>
              <p className="text-gray-600 text-sm">მოაწყეთ ვიზიტი ადგილობრივ თავშესაფარში მეგობრებთან ერთად და გადაიღეთ ვლოგი ძაღლების ყოველდღიურობაზე.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 py-12 px-6 text-center border-t border-gray-200">
        <p className="text-gray-500 text-sm mb-2">ნუ იყიდი, იშვილე – იპოვნე შენი საუკეთესო მეგობარი</p>
        <p className="text-gray-400 text-xs font-mono">© 2026 Animal Welfare Guide</p>
      </footer>
    </div>
  );
}
