
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Message, UserState, ChatSession, AppMode, Attachment } from './types';
import { APP_ICON_URL, MEDICAL_LINK, RELIGIOUS_LINK, WHATSAPP_LINK, BG_HOME, BG_CHAT, BG_CODING, BG_PROMPT, BG_PSYCHO, DEVELOPER_PHONE, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, GEMINI_GEM_LINK } from './constants';
import { SendIcon, PaperClipIcon, CopyIcon, MenuIcon, PlusIcon, PaletteIcon, RobotIcon, CodeIcon, SparklesIcon, MoonIcon, StethoscopeIcon, HeartHandshakeIcon, WhatsAppIcon, BackIcon } from './Icons';
import { sendChatMessage, generateCodeAssistant, engineerPrompt, psychologicalSupport } from './geminiService';

const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

// --- COMPONENTS ---
const NavButton = ({ label, onClick, active }: { label: string, onClick: () => void, active?: boolean }) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-lg text-sm font-bold tracking-wide transition-all border ${active ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-black/30 text-white border-white/20 hover:bg-white/10'}`}>
        {label}
    </button>
);

const FeatureCard = ({ title, sub, icon, color, onClick, colSpan = "col-span-1" }: { title: string, sub: string, icon: React.ReactNode, color: string, onClick: () => void, colSpan?: string }) => {
    return (
        <div onClick={onClick} className={`group relative p-8 rounded-[2rem] bg-black/40 border border-white/10 cursor-pointer transition-all duration-500 hover:-translate-y-2 overflow-hidden ${colSpan} hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-md`}>
            {/* Hover Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/0 via-${color}-500/0 to-${color}-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
            
            <div className={`mb-6 text-white transform group-hover:scale-110 transition-transform duration-500 group-hover:text-${color}-400 drop-shadow-lg`}>
                {React.cloneElement(icon as React.ReactElement<any>, { className: "w-12 h-12" })}
            </div>
            
            <h3 className="text-2xl font-display font-bold text-white mb-2 relative z-10 group-hover:text-gold transition-colors">{title}</h3>
            <p className="text-sm text-gray-300 group-hover:text-white transition-colors relative z-10">{sub}</p>
            
            <div className={`absolute bottom-6 left-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-${color}-500 group-hover:scale-110 transition-all duration-300`}>
                <span className="text-lg">↗</span>
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  
  const [user, setUser] = useState<UserState>({ isLoggedIn: false, trials: { CHAT: 0, CODING: 0, PROMPT_ENG: 0, PSYCHO: 0 } });
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
    const savedUser = localStorage.getItem('ai_amar_user');
    const savedSessions = localStorage.getItem('ai_amar_sessions');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
  }, []);

  useEffect(() => { localStorage.setItem('ai_amar_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { if (messages.length > 0 && view === ViewState.APP) { saveSession(); scrollToBottom(); } }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const saveSession = () => {
    const updatedSessions = [...sessions];
    const index = updatedSessions.findIndex(s => s.id === currentSessionId);
    const lastMsg = messages[messages.length - 1];
    const preview = lastMsg ? (lastMsg.attachment ? '📎 مرفق' : lastMsg.text.substring(0, 30) + '...') : '...';
    
    const sessionData: ChatSession = {
        id: currentSessionId,
        mode: activeMode,
        title: index >= 0 ? updatedSessions[index].title : 'جلسة جديدة',
        preview,
        date: new Date().toLocaleDateString('ar-EG'),
        messages
    };
    if (index >= 0) updatedSessions[index] = sessionData;
    else updatedSessions.unshift(sessionData);
    setSessions(updatedSessions);
    localStorage.setItem('ai_amar_sessions', JSON.stringify(updatedSessions));
  };

  const startApp = (mode: AppMode) => {
    if (!user.isLoggedIn && user.trials[mode] >= 2) {
        setShowAuthModal(true);
        return;
    }
    setActiveMode(mode);
    setMessages([]);
    setInput('');
    setAttachment(null);
    setCurrentSessionId(Date.now().toString());
    setView(ViewState.APP);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;
    const newMessage: Message = { id: Date.now().toString(), role: 'user', text: input, attachment: attachment || undefined, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    if (!user.isLoggedIn) {
        setUser(prev => ({ ...prev, trials: { ...prev.trials, [activeMode]: (prev.trials[activeMode] || 0) + 1 } }));
    }

    try {
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })); 
        let response;
        if (activeMode === AppMode.CHAT) response = await sendChatMessage(newMessage.text, history, newMessage.attachment);
        else if (activeMode === AppMode.CODING) response = await generateCodeAssistant(newMessage.text, history, newMessage.attachment);
        else if (activeMode === AppMode.PROMPT_ENG) response = await engineerPrompt(newMessage.text, history, newMessage.attachment);
        else if (activeMode === AppMode.PSYCHO) response = await psychologicalSupport(newMessage.text, history, newMessage.attachment);
        else response = { text: "Error" };

        const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            timestamp: Date.now(),
            attachment: response.generatedImage ? { name: "img.png", type: "image/png", data: "", dataUrl: response.generatedImage } : undefined,
            suggestedPrompt: response.suggestedPrompt
        };
        setMessages(prev => [...prev, botMessage]);
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "حدث خطأ غير متوقع.", isError: true, timestamp: Date.now() }]);
    } finally {
        setIsLoading(false);
    }
  };

  // Auth & Utility Functions
  const getStoredAuth = () => { try { return JSON.parse(localStorage.getItem('ai_amar_auth_db') || '{}'); } catch { return {}; } };
  const saveAuth = (phone: string, pass: string, name: string) => {
      const db = getStoredAuth();
      db[phone] = { password: pass, name: name };
      localStorage.setItem('ai_amar_auth_db', JSON.stringify(db));
  };
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'REGISTER') {
        saveAuth(authForm.phone, authForm.password, authForm.name);
        setUser({ isLoggedIn: true, name: authForm.name, phone: authForm.phone, trials: user.trials });
        setShowAuthModal(false);
        try {
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: EMAILJS_SERVICE_ID,
                    template_id: EMAILJS_TEMPLATE_ID,
                    user_id: EMAILJS_PUBLIC_KEY,
                    template_params: { from_name: authForm.name, phone: authForm.phone }
                })
            });
        } catch (error) { console.error("Email Error", error); }
    } else {
        const db = getStoredAuth();
        const storedUser = db[authForm.phone];
        if (storedUser && storedUser.password === authForm.password) {
            setUser({ isLoggedIn: true, name: storedUser.name, phone: authForm.phone, trials: user.trials });
            setShowAuthModal(false);
        } else {
            alert("بيانات الدخول غير صحيحة!");
        }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) setAttachment({ name: file.name, type: file.type, data: "", dataUrl: ev.target.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleGeminiRedirect = (promptText: string) => {
      const clean = promptText.replace(/```text|```/g, '').trim();
      navigator.clipboard.writeText(clean);
      alert('تم نسخ البرومبت بنجاح! قم بلصقه (Paste) في موقع Gemini Studio الذي سيفتح الآن.');
      window.open(GEMINI_GEM_LINK, '_blank');
  };

  const getBackground = () => {
      if (view === ViewState.DASHBOARD) return BG_HOME;
      if (activeMode === AppMode.CODING) return BG_CODING;
      if (activeMode === AppMode.PROMPT_ENG) return BG_PROMPT;
      if (activeMode === AppMode.PSYCHO) return BG_PSYCHO;
      return BG_CHAT;
  };

  const getThemeColor = () => {
      if (activeMode === AppMode.CODING) return 'yellow';
      if (activeMode === AppMode.PROMPT_ENG) return 'purple';
      if (activeMode === AppMode.PSYCHO) return 'teal';
      return 'cyan';
  }

  const theme = getThemeColor();

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white bg-black font-sans selection:bg-gold selection:text-black">
        
        {/* GLOBAL VIBRANT BACKGROUND */}
        <div className="absolute inset-0 z-0 bg-black">
             <div className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${view === ViewState.APP ? 'scale-105 opacity-80' : 'scale-100 opacity-100'}`} style={{ backgroundImage: `url('${getBackground()}')` }}></div>
             {/* Gradient Overlay for Readability but keeping vibrancy */}
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40 backdrop-blur-[0px]"></div>
             
             {/* Extra Decorative Orbs in Dashboard to enhance colors */}
             {view === ViewState.DASHBOARD && (
                 <>
                    <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow pointer-events-none"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-gold/20 rounded-full blur-[120px] mix-blend-screen animate-float pointer-events-none"></div>
                 </>
             )}
        </div>

        {/* AUTH MODAL - GRAND REDESIGN */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
                 <div className="relative bg-black/40 border border-white/10 p-10 rounded-[2.5rem] w-full max-w-lg text-center shadow-[0_0_100px_rgba(255,215,0,0.15)] overflow-hidden backdrop-blur-2xl animate-slide-up group">
                    
                    {/* Ambient Glows */}
                    <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-gradient-to-br from-gold/20 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-[-50%] right-[-50%] w-full h-full bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
                    
                    <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-20">✕</button>
                    
                    <div className="relative z-10">
                        {/* Logo Mark */}
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gold to-yellow-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl rotate-3 transform group-hover:rotate-0 transition-all duration-500">
                             <span className="font-display font-black text-4xl text-black">A</span>
                        </div>
                        
                        <h2 className="text-4xl font-display font-bold mb-2 text-white tracking-tight">AMAR <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200">ACCESS</span></h2>
                        <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-8 font-light">The Gateway to Artificial Intelligence</p>
                        
                        <form onSubmit={handleAuthSubmit} className="space-y-5 text-right">
                            {authMode === 'REGISTER' && (
                                <div className="group/input relative">
                                    <input type="text" required className="w-full bg-white/5 border-b border-white/20 p-4 text-white placeholder-transparent focus:outline-none focus:border-gold transition-all peer rounded-t-lg" id="name" placeholder="Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                                    <label htmlFor="name" className="absolute right-4 top-4 text-white/40 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-gold pointer-events-none">الاسم الكامل</label>
                                </div>
                            )}
                            <div className="group/input relative">
                                <input type="tel" required className="w-full bg-white/5 border-b border-white/20 p-4 text-white placeholder-transparent focus:outline-none focus:border-gold transition-all peer rounded-t-lg" id="phone" placeholder="Phone" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                                <label htmlFor="phone" className="absolute right-4 top-4 text-white/40 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-gold pointer-events-none">رقم الهاتف</label>
                            </div>
                            <div className="group/input relative">
                                 <input type="password" required className="w-full bg-white/5 border-b border-white/20 p-4 text-white placeholder-transparent focus:outline-none focus:border-gold transition-all peer rounded-t-lg" id="pass" placeholder="Password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                <label htmlFor="pass" className="absolute right-4 top-4 text-white/40 text-sm transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-[-10px] peer-focus:text-xs peer-focus:text-gold pointer-events-none">كلمة المرور</label>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-gold via-yellow-500 to-gold bg-[length:200%_auto] hover:bg-[100%_0] text-black py-4 rounded-xl font-black transition-all duration-500 uppercase tracking-widest text-sm mt-6 shadow-[0_0_30px_rgba(255,215,0,0.3)] transform hover:scale-[1.02]">
                                {authMode === 'REGISTER' ? 'بدء الرحلة' : 'دخول النظام'}
                            </button>
                        </form>
                        
                        <div className="mt-8 flex gap-6 justify-center text-xs tracking-widest uppercase">
                            <button onClick={() => setAuthMode('REGISTER')} className={`transition-all pb-1 ${authMode === 'REGISTER' ? 'text-gold font-bold border-b border-gold' : 'text-white/40 hover:text-white'}`}>New Account</button>
                            <button onClick={() => setAuthMode('LOGIN')} className={`transition-all pb-1 ${authMode === 'LOGIN' ? 'text-gold font-bold border-b border-gold' : 'text-white/40 hover:text-white'}`}>Login</button>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {/* --- HEADER --- */}
        <header className="relative z-50 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView(ViewState.DASHBOARD)}>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center transition-all group-hover:bg-gold group-hover:text-black">
                    <span className="font-display font-black text-2xl">A</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-display font-bold tracking-widest text-white drop-shadow-md">AMAR <span className="text-gold">SCRIPT</span></h1>
                    <span className="text-[0.6rem] text-white/70 tracking-[0.3em] uppercase">Studio</span>
                </div>
            </div>
            
            <div className="flex gap-4 items-center">
                {!user.isLoggedIn ? (
                    <button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 bg-white/20 border border-white/20 rounded-lg text-xs font-bold tracking-wider hover:bg-white hover:text-black transition-all uppercase backdrop-blur-md shadow-lg">
                        Login
                    </button>
                ) : (
                     <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{user.name}</span>
                        <button onClick={() => setUser({isLoggedIn:false, trials:user.trials})} className="text-xs text-red-400 hover:text-white ml-2">✕</button>
                     </div>
                )}
            </div>
        </header>

        {/* --- DASHBOARD VIEW --- */}
        {view === ViewState.DASHBOARD && (
            <main className="relative z-40 container mx-auto px-4 py-8 flex flex-col items-center animate-fade-in h-[calc(100vh-100px)] overflow-y-auto">
                
                {/* Hero Text */}
                <div className="text-center mb-12 mt-8">
                    <h2 className="text-5xl md:text-7xl font-display font-black mb-6 leading-tight text-white drop-shadow-2xl">
                        WELCOME TO <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-white to-gold animate-glow">THE FUTURE</span>
                    </h2>
                    <p className="text-lg text-white/90 font-medium max-w-2xl mx-auto drop-shadow-md bg-black/20 p-2 rounded-lg backdrop-blur-sm inline-block">
                        منصة المطور <span className="text-gold font-bold">عمار مصطفى</span>. حيث يلتقي الإبداع بالذكاء.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                    <FeatureCard 
                        title="محادثة ذكية" 
                        sub="SMART ASSISTANT" 
                        icon={<RobotIcon />} 
                        color="cyan" 
                        onClick={() => startApp(AppMode.CHAT)} 
                    />
                    <FeatureCard 
                        title="خبير الأكواد" 
                        sub="CODE MASTER" 
                        icon={<CodeIcon />} 
                        color="yellow" 
                        onClick={() => startApp(AppMode.CODING)} 
                    />
                    <FeatureCard 
                        title="هندسة الأوامر" 
                        sub="PROMPT STUDIO" 
                        icon={<SparklesIcon />} 
                        color="purple" 
                        onClick={() => startApp(AppMode.PROMPT_ENG)} 
                    />
                     <FeatureCard 
                        title="صديقي (AI Friend)" 
                        sub="PSYCHO SUPPORT" 
                        icon={<HeartHandshakeIcon />} 
                        color="teal" 
                        onClick={() => startApp(AppMode.PSYCHO)} 
                    />
                    <FeatureCard 
                        title="القسم الإسلامي" 
                        sub="RELIGIOUS" 
                        icon={<MoonIcon />} 
                        color="green" 
                        onClick={() => window.open(RELIGIOUS_LINK, '_blank')} 
                    />
                    <FeatureCard 
                        title="القسم الطبي" 
                        sub="MEDICAL" 
                        icon={<StethoscopeIcon />} 
                        color="red" 
                        onClick={() => window.open(MEDICAL_LINK, '_blank')} 
                    />
                </div>

                {/* Footer with Whatsapp */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <a href={WHATSAPP_LINK} target="_blank" className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full hover:bg-green-500 hover:border-green-400 hover:text-white text-white/80 transition-all shadow-2xl">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Developed By Amar</span>
                        <WhatsAppIcon />
                    </a>
                </div>
            </main>
        )}

        {/* --- APP VIEW (Chat Interface) --- */}
        {view === ViewState.APP && (
            <div className="relative z-40 flex h-[calc(100vh-90px)] container mx-auto max-w-[1600px] animate-slide-up px-0 md:px-8 pb-4">
                
                {/* Sidebar (Glass) */}
                <aside className={`fixed inset-y-0 right-0 z-50 w-80 bg-black/60 backdrop-blur-2xl border-l border-white/10 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 md:bg-black/30 md:border md:border-white/10 md:rounded-2xl flex flex-col py-4 md:py-0 shadow-2xl md:ml-6 order-2 md:order-1`}>
                    <div className="px-6 py-4 md:hidden flex justify-between items-center border-b border-white/10 mb-4">
                        <span className="text-white font-bold">القائمة</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-white">✕</button>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-4 py-4 md:px-4 scrollbar-hide">
                         <button onClick={() => startApp(activeMode)} className={`w-full py-4 bg-white/20 hover:bg-white text-white hover:text-black rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 uppercase tracking-wider backdrop-blur-sm shadow-lg`}>
                            <PlusIcon /> New Session
                        </button>
                        
                        <div className="space-y-2 mt-2">
                            <h3 className="text-xs text-white/50 uppercase tracking-widest px-2 mb-2">History</h3>
                            {sessions.filter(s => s.mode === activeMode).map(s => (
                                <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setMessages(s.messages); setIsSidebarOpen(false); }} className={`p-4 rounded-xl cursor-pointer transition-all border group ${currentSessionId === s.id ? `bg-white/20 border-white/30 text-white` : 'bg-transparent border-transparent hover:bg-white/10 text-white/70'}`}>
                                    <h4 className={`text-sm font-bold truncate mb-1`}>{s.title}</h4>
                                    <p className="text-[10px] truncate font-mono opacity-60">{s.preview}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area (Translucent) */}
                <main className="flex-1 flex flex-col relative bg-black/20 backdrop-blur-lg md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl order-1 md:order-2">
                    
                    {/* Chat Header */}
                    <div className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white"><MenuIcon /></button>
                             <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-lg`}>
                                {activeMode === AppMode.CHAT ? <RobotIcon /> : activeMode === AppMode.CODING ? <CodeIcon /> : activeMode === AppMode.PSYCHO ? <HeartHandshakeIcon /> : <SparklesIcon />}
                             </div>
                             <div className="text-white">
                                 <h2 className="text-sm font-bold uppercase tracking-widest drop-shadow-md">
                                    {activeMode === AppMode.CODING ? 'Amar Code' : activeMode === AppMode.PROMPT_ENG ? 'Amar Prompt' : activeMode === AppMode.PSYCHO ? 'My Friend' : 'Amar Chat'}
                                 </h2>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse`}></div>
                                    <span className="text-[10px] opacity-70 font-mono">ONLINE</span>
                                 </div>
                             </div>
                        </div>
                        <button onClick={() => setView(ViewState.DASHBOARD)} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:bg-white hover:text-black transition-all">
                            <BackIcon />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-80 animate-fade-in text-white">
                                <div className={`w-32 h-32 rounded-full border-2 border-white/20 flex items-center justify-center mb-6 relative bg-white/5 backdrop-blur-md shadow-[0_0_50px_rgba(255,255,255,0.1)]`}>
                                    <span className="text-6xl drop-shadow-lg">
                                        {activeMode === AppMode.CHAT ? <RobotIcon /> : activeMode === AppMode.CODING ? <CodeIcon /> : activeMode === AppMode.PSYCHO ? <HeartHandshakeIcon /> : <SparklesIcon />}
                                    </span>
                                </div>
                                <p className="text-2xl font-display font-bold tracking-[0.2em] uppercase drop-shadow-md">Amar AI Ready</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                                <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-3xl text-sm leading-7 shadow-lg relative backdrop-blur-md border ${msg.role === 'user' ? `bg-${theme}-600/80 border-${theme}-400 text-white rounded-br-none` : `bg-black/60 border-white/10 text-white rounded-bl-none`}`}>
                                    
                                    {msg.role === 'model' && <div className="absolute top-2 left-2 text-[10px] font-bold opacity-50 uppercase tracking-wider">AMAR AI</div>}

                                    {msg.attachment && (
                                        <div className="mb-4 rounded-xl overflow-hidden border border-white/20 shadow-md mt-2">
                                            {msg.attachment.type.startsWith('image') ? <img src={msg.attachment.dataUrl} className="max-w-xs object-cover" /> : <div className="p-3 bg-white/10 flex gap-2"><PaperClipIcon /><span className="text-xs">{msg.attachment.name}</span></div>}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap font-sans relative z-10 mt-2" dir="auto">
                                        {msg.text.split('```').map((part, index) => (
                                            index % 2 === 1 ? (
                                                <div key={index} className="my-4 bg-black/50 p-4 rounded-xl border border-white/10 text-xs md:text-sm font-mono overflow-x-auto text-green-400 shadow-inner">
                                                    <button onClick={() => {navigator.clipboard.writeText(part); alert('تم النسخ');}} className="float-right text-white/50 hover:text-white"><CopyIcon /></button>
                                                    {part}
                                                </div>
                                            ) : <span key={index}>{part}</span>
                                        ))}
                                    </div>
                                    
                                    {msg.suggestedPrompt && (
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <button onClick={() => handleGeminiRedirect(msg.suggestedPrompt!)} className="w-full py-3 bg-purple-600/40 hover:bg-purple-600 border border-purple-500/50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                                                <PaletteIcon />
                                                <span>نسخ وفتح الاستوديو</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-white/60 mt-2 px-2 font-mono shadow-black drop-shadow-md">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-3 px-4 py-4 bg-white/5 w-fit rounded-full backdrop-blur-md">
                                <div className={`w-2 h-2 bg-white rounded-full animate-bounce`}></div>
                                <div className={`w-2 h-2 bg-white rounded-full animate-bounce delay-100`}></div>
                                <div className={`w-2 h-2 bg-white rounded-full animate-bounce delay-200`}></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white/5 border-t border-white/10 backdrop-blur-xl">
                        <div className={`relative flex items-end gap-3 bg-black/40 border border-white/10 focus-within:border-white/40 rounded-3xl p-3 transition-all shadow-xl`}>
                            {attachment && (
                                <div className="absolute bottom-full left-0 mb-4 p-3 bg-black/80 rounded-xl border border-white/10 flex items-center gap-3 shadow-2xl backdrop-blur-md">
                                    <span className="text-xs max-w-[150px] truncate text-white">{attachment.name}</span>
                                    <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-white transition-colors">✕</button>
                                </div>
                            )}
                            <input type="file" id="up" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            <label htmlFor="up" className={`p-3 mb-1 text-white/50 hover:text-white cursor-pointer transition-colors hover:bg-white/5 rounded-xl`}><PaperClipIcon /></label>
                            
                            <textarea 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSendMessage();}}}
                                placeholder={activeMode === AppMode.PROMPT_ENG ? "صف خيالك..." : activeMode === AppMode.PSYCHO ? "فضفض براحتك..." : "اكتب رسالتك..."}
                                className="flex-1 bg-transparent outline-none text-white text-right placeholder-white/30 resize-none max-h-32 min-h-[50px] text-sm leading-6 py-3"
                                rows={1}
                            />
                            
                            <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && !attachment)} className={`p-3 mb-1 bg-white text-black rounded-xl hover:bg-gold hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none`}>
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        )}
    </div>
  );
};

export default App;
