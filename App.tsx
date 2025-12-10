
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Message, UserState, ChatSession, AppMode, Attachment } from './types';
import { APP_ICON_URL, MEDICAL_LINK, RELIGIOUS_LINK, WHATSAPP_LINK, BG_HOME, BG_CHAT, BG_CODING, BG_PROMPT, BG_PSYCHO, DEVELOPER_PHONE, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, GEMINI_GEM_LINK } from './constants';
import { SendIcon, PaperClipIcon, CopyIcon, MenuIcon, PlusIcon, PaletteIcon, RobotIcon, CodeIcon, SparklesIcon, MoonIcon, StethoscopeIcon, HeartHandshakeIcon, WhatsAppIcon, BackIcon } from './Icons';
import { sendChatMessage, generateCodeAssistant, engineerPrompt, psychologicalSupport } from './geminiService';

const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

// --- COMPONENTS ---
const NavButton = ({ label, onClick, active }: { label: string, onClick: () => void, active?: boolean }) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-lg text-sm font-bold tracking-wide transition-all border ${active ? 'bg-gold text-black border-gold shadow-neon-gold' : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:border-white/20'}`}>
        {label}
    </button>
);

const FeatureCard = ({ title, sub, icon, color, onClick, colSpan = "col-span-1" }: { title: string, sub: string, icon: React.ReactNode, color: string, onClick: () => void, colSpan?: string }) => {
    // Map colors to Tailwind classes dynamically
    const glowColor = {
        'cyan': 'group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] group-hover:border-cyan-500/50',
        'yellow': 'group-hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] group-hover:border-yellow-500/50',
        'purple': 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] group-hover:border-purple-500/50',
        'teal': 'group-hover:shadow-[0_0_30px_rgba(20,184,166,0.4)] group-hover:border-teal-500/50',
        'green': 'group-hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:border-green-500/50',
        'red': 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] group-hover:border-red-500/50',
    }[color] || '';

    const textColor = {
        'cyan': 'text-cyan-400',
        'yellow': 'text-yellow-400',
        'purple': 'text-purple-400',
        'teal': 'text-teal-400',
        'green': 'text-green-400',
        'red': 'text-red-400',
    }[color] || 'text-white';

    return (
        <div onClick={onClick} className={`group relative p-8 rounded-[2rem] bg-[#0a0a0a] border border-white/5 cursor-pointer transition-all duration-500 hover:-translate-y-2 overflow-hidden ${colSpan} ${glowColor}`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-${color}-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
            
            {/* Animated Orb */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 bg-${color}-500/10 rounded-full blur-[80px] group-hover:bg-${color}-500/20 transition-all duration-500`}></div>

            <div className={`mb-6 ${textColor} transform group-hover:scale-110 transition-transform duration-500`}>
                {React.cloneElement(icon as React.ReactElement, { className: "w-10 h-10" })}
            </div>
            
            <h3 className="text-2xl font-display font-bold text-white mb-2 relative z-10">{title}</h3>
            <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors relative z-10">{sub}</p>
            
            <div className={`absolute bottom-6 left-6 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 group-hover:bg-${color}-500 group-hover:text-white group-hover:border-transparent transition-all duration-300`}>
                <span className="text-sm">↗</span>
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

  const getThemeColor = () => {
      if (activeMode === AppMode.CODING) return 'yellow';
      if (activeMode === AppMode.PROMPT_ENG) return 'purple';
      if (activeMode === AppMode.PSYCHO) return 'teal';
      return 'cyan';
  }

  const theme = getThemeColor();

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white bg-black font-sans selection:bg-gold selection:text-black">
        
        {/* GLOBAL ANIMATED BACKGROUND - DARK MODE LUXURY */}
        <div className="absolute inset-0 z-0 bg-black">
             {/* Deep Space Background */}
             <div className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-40`} style={{ backgroundImage: `url('https://images.unsplash.com/photo-1464699908137-9c71640edb3b?q=80&w=2070&auto=format&fit=crop')` }}></div>
             
             {/* Dynamic Gradients */}
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/60"></div>
             
             {/* Neon Glows */}
             <div className={`absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-${theme}-600/10 rounded-full blur-[150px] animate-pulse-slow`}></div>
             <div className={`absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px] animate-float`}></div>
        </div>

        {/* AUTH MODAL - GLASS STYLE */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
                 <div className="bg-[#0f0f0f] border border-gold/20 p-8 rounded-[2rem] w-full max-w-md text-center shadow-[0_0_60px_rgba(255,215,0,0.05)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                    <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">✕</button>
                    
                    <h2 className="text-3xl font-display font-bold mb-2 text-white">ACCESS <span className="text-gold">GRANTED</span></h2>
                    <p className="text-gray-500 text-xs mb-8 uppercase tracking-[0.2em]">Amar Script Studio Gate</p>
                    
                     <form onSubmit={handleAuthSubmit} className="space-y-4 text-right">
                        {authMode === 'REGISTER' && <input type="text" placeholder="الاسم الكامل" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-gold transition-colors text-sm" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
                        <input type="tel" placeholder="رقم الهاتف" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-gold transition-colors text-sm" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                        <input type="password" placeholder="كلمة المرور" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-gold transition-colors text-sm" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                        <button type="submit" className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black py-4 rounded-xl font-bold hover:shadow-neon-gold transition-all uppercase tracking-wider text-sm mt-4">{authMode === 'REGISTER' ? 'تفعيل الحساب' : 'دخول النظام'}</button>
                    </form>
                    
                    <div className="mt-6 flex gap-4 justify-center text-xs text-white/30">
                        <button onClick={() => setAuthMode('REGISTER')} className={authMode === 'REGISTER' ? 'text-gold underline' : 'hover:text-white'}>تسجيل جديد</button>
                        <span>•</span>
                        <button onClick={() => setAuthMode('LOGIN')} className={authMode === 'LOGIN' ? 'text-gold underline' : 'hover:text-white'}>تسجيل دخول</button>
                    </div>
                 </div>
            </div>
        )}

        {/* --- HEADER --- */}
        <header className="relative z-50 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/5 bg-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView(ViewState.DASHBOARD)}>
                {/* Logo Mark */}
                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center group-hover:border-gold/50 transition-colors relative overflow-hidden">
                    <div className="absolute inset-0 bg-gold/10 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-2xl"></div>
                    <span className="font-display font-black text-white text-2xl group-hover:text-gold transition-colors">A</span>
                </div>
                {/* Logo Text */}
                <div className="flex flex-col">
                    <h1 className="text-xl font-display font-bold tracking-widest text-white">AMAR <span className="text-gold">SCRIPT</span></h1>
                    <span className="text-[0.6rem] text-gray-500 tracking-[0.3em] uppercase group-hover:text-gold/80 transition-colors">Studio</span>
                </div>
            </div>
            
            <div className="flex gap-4 items-center">
                {!user.isLoggedIn ? (
                    <button onClick={() => setShowAuthModal(true)} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold tracking-wider hover:bg-gold hover:text-black hover:border-gold transition-all uppercase">
                        Login
                    </button>
                ) : (
                     <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_10px_#0AFF60]"></div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{user.name}</span>
                        <button onClick={() => setUser({isLoggedIn:false, trials:user.trials})} className="text-xs text-red-500/50 hover:text-red-400 ml-2">✕</button>
                     </div>
                )}
            </div>
        </header>

        {/* --- DASHBOARD VIEW --- */}
        {view === ViewState.DASHBOARD && (
            <main className="relative z-40 container mx-auto px-4 py-8 flex flex-col items-center animate-fade-in h-[calc(100vh-100px)]">
                
                {/* Hero Text */}
                <div className="text-center mb-16 mt-8 relative">
                    <div className="absolute -inset-10 bg-gold/5 blur-[100px] rounded-full"></div>
                    <h2 className="relative text-5xl md:text-8xl font-display font-black mb-6 leading-tight text-white tracking-tight">
                        DIGITAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-gold text-glow">EMPIRE</span>
                    </h2>
                    <p className="relative text-sm md:text-base text-gray-400 font-light max-w-2xl mx-auto tracking-wide leading-relaxed">
                        منصة <span className="text-gold font-bold">عمار مصطفى</span> المتطورة. 
                        تجربة ذكاء اصطناعي نخبوية تجمع بين الإبداع التقني والدعم الإنساني.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    <FeatureCard 
                        title="محادثة ذكية" 
                        sub="SMART ASSISTANT" 
                        icon={<RobotIcon />} 
                        color="cyan" 
                        onClick={() => startApp(AppMode.CHAT)} 
                    />
                    <FeatureCard 
                        title="خبير الأكواد" 
                        sub="DEV ENV" 
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
                    <a href={WHATSAPP_LINK} target="_blank" className="flex items-center gap-3 px-6 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full hover:border-green-500/50 hover:bg-green-900/10 transition-all group">
                        <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] group-hover:text-green-400">Developed By Amar</span>
                        <span className="text-green-500 group-hover:scale-110 transition-transform"><WhatsAppIcon /></span>
                    </a>
                </div>
            </main>
        )}

        {/* --- APP VIEW (Chat Interface) --- */}
        {view === ViewState.APP && (
            <div className="relative z-40 flex h-[calc(100vh-90px)] container mx-auto max-w-[1600px] animate-slide-up px-0 md:px-8 pb-4">
                
                {/* Sidebar (Desktop) */}
                <aside className={`fixed inset-y-0 right-0 z-50 w-80 bg-[#080808] border-l border-white/5 transform transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 md:bg-transparent md:border-none flex flex-col py-4 md:py-0 shadow-2xl md:shadow-none`}>
                    <div className="px-6 py-4 md:hidden flex justify-between items-center border-b border-white/5 mb-4">
                        <span className="text-gold font-bold">القائمة</span>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-white">✕</button>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto px-4 md:px-0 scrollbar-hide">
                         <button onClick={() => startApp(activeMode)} className={`w-full py-5 bg-${theme}-600/10 border border-${theme}-500/20 text-${theme}-400 rounded-2xl font-bold text-sm hover:bg-${theme}-500 hover:text-black hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-3 uppercase tracking-wider`}>
                            <PlusIcon /> New Session
                        </button>
                        
                        <div className="space-y-2 mt-2">
                            <h3 className="text-xs text-gray-600 uppercase tracking-widest px-2 mb-2">History</h3>
                            {sessions.filter(s => s.mode === activeMode).map(s => (
                                <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setMessages(s.messages); setIsSidebarOpen(false); }} className={`p-4 rounded-xl cursor-pointer transition-all border group ${currentSessionId === s.id ? `bg-white/5 border-${theme}-500/30` : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                                    <h4 className={`text-sm font-bold text-gray-300 truncate mb-1 group-hover:text-${theme}-400 transition-colors`}>{s.title}</h4>
                                    <p className="text-[10px] text-gray-600 truncate font-mono">{s.preview}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col relative bg-[#0a0a0a] md:rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl ml-0 md:ml-6">
                    
                    {/* Chat Header */}
                    <div className="h-20 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-white/70 hover:text-gold"><MenuIcon /></button>
                             <div className={`w-10 h-10 rounded-xl bg-${theme}-500/10 flex items-center justify-center text-${theme}-400 border border-${theme}-500/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                                {activeMode === AppMode.CHAT ? <RobotIcon /> : activeMode === AppMode.CODING ? <CodeIcon /> : activeMode === AppMode.PSYCHO ? <HeartHandshakeIcon /> : <SparklesIcon />}
                             </div>
                             <div>
                                 <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                                    {activeMode === AppMode.CODING ? 'Code Master' : activeMode === AppMode.PROMPT_ENG ? 'Prompt Studio' : activeMode === AppMode.PSYCHO ? 'AI Friend' : 'Smart Chat'}
                                 </h2>
                                 <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full bg-${theme}-500`}></div>
                                    <span className={`text-[10px] text-${theme}-500/70 font-mono`}>ONLINE</span>
                                 </div>
                             </div>
                        </div>
                        <button onClick={() => setView(ViewState.DASHBOARD)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all">
                            <BackIcon />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 animate-fade-in">
                                <div className={`w-32 h-32 rounded-full border border-${theme}-500/20 flex items-center justify-center mb-6 relative`}>
                                    <div className={`absolute inset-0 rounded-full bg-${theme}-500/5 blur-xl animate-pulse`}></div>
                                    <span className={`text-6xl text-${theme}-500/50`}>
                                        {activeMode === AppMode.CHAT ? <RobotIcon /> : activeMode === AppMode.CODING ? <CodeIcon /> : activeMode === AppMode.PSYCHO ? <HeartHandshakeIcon /> : <SparklesIcon />}
                                    </span>
                                </div>
                                <p className="text-2xl font-display font-bold text-white/20 tracking-[0.5em] uppercase">System Ready</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up group`}>
                                <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-3xl text-sm leading-7 shadow-lg relative overflow-hidden ${msg.role === 'user' ? `bg-white/5 text-white border border-white/10 rounded-br-none` : `bg-black border border-${theme}-900/30 text-gray-300 rounded-bl-none`}`}>
                                    {/* Bot Glow Effect */}
                                    {msg.role === 'model' && <div className={`absolute top-0 left-0 w-1 h-full bg-${theme}-500/50`}></div>}

                                    {msg.attachment && (
                                        <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                                            {msg.attachment.type.startsWith('image') ? <img src={msg.attachment.dataUrl} className="max-w-xs object-cover" /> : <div className="p-3 bg-white/5 flex gap-2"><PaperClipIcon /><span className="text-xs">{msg.attachment.name}</span></div>}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap font-sans relative z-10" dir="auto">
                                        {msg.text.split('```').map((part, index) => (
                                            index % 2 === 1 ? (
                                                <div key={index} className="my-4 bg-[#050505] p-4 rounded-xl border border-white/10 text-xs md:text-sm font-mono overflow-x-auto relative group/code text-gray-300">
                                                    <button onClick={() => {navigator.clipboard.writeText(part); alert('تم النسخ');}} className="absolute top-2 right-2 text-white/20 hover:text-white transition-colors opacity-0 group-hover/code:opacity-100"><CopyIcon /></button>
                                                    {part}
                                                </div>
                                            ) : <span key={index}>{part}</span>
                                        ))}
                                    </div>
                                    
                                    {msg.suggestedPrompt && (
                                        <div className="mt-6 pt-4 border-t border-white/5">
                                            <button onClick={() => handleGeminiRedirect(msg.suggestedPrompt!)} className="w-full py-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 text-purple-200 rounded-xl text-xs font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-400 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                                                <PaletteIcon />
                                                <span>Copy & Launch Studio</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-600 mt-2 px-2 font-mono">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-3 px-4">
                                <div className={`w-2 h-2 bg-${theme}-500 rounded-full animate-bounce`}></div>
                                <div className={`w-2 h-2 bg-${theme}-500 rounded-full animate-bounce delay-100`}></div>
                                <div className={`w-2 h-2 bg-${theme}-500 rounded-full animate-bounce delay-200`}></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 md:p-8 bg-black/60 border-t border-white/5 backdrop-blur-xl">
                        <div className={`relative flex items-end gap-3 bg-[#0f0f0f] border border-white/5 focus-within:border-${theme}-500/50 rounded-3xl p-3 transition-all shadow-xl`}>
                            {attachment && (
                                <div className="absolute bottom-full left-0 mb-4 p-3 bg-[#1a1a1a] rounded-xl border border-white/10 flex items-center gap-3 shadow-2xl">
                                    <span className="text-xs max-w-[150px] truncate text-white/90">{attachment.name}</span>
                                    <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-white transition-colors">✕</button>
                                </div>
                            )}
                            <input type="file" id="up" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            <label htmlFor="up" className={`p-3 mb-1 text-white/30 hover:text-${theme}-400 cursor-pointer transition-colors hover:bg-white/5 rounded-xl`}><PaperClipIcon /></label>
                            
                            <textarea 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSendMessage();}}}
                                placeholder={activeMode === AppMode.PROMPT_ENG ? "Describe your vision..." : activeMode === AppMode.PSYCHO ? "How are you feeling..." : "Type a message..."}
                                className="flex-1 bg-transparent outline-none text-white text-right placeholder-white/20 resize-none max-h-32 min-h-[50px] text-sm leading-6 py-3"
                                rows={1}
                            />
                            
                            <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && !attachment)} className={`p-3 mb-1 bg-${theme}-600 text-black rounded-xl hover:bg-${theme}-400 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed`}>
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
