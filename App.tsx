
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Message, UserState, ChatSession, AppMode, Attachment } from './types';
import { APP_ICON_URL, MEDICAL_LINK, RELIGIOUS_LINK, BG_HOME, BG_CHAT, BG_IMAGE_GEN, DEVELOPER_PHONE, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from './constants';
import { SendIcon, PaperClipIcon, TrashIcon, CopyIcon, MenuIcon, PlusIcon, PaletteIcon } from './Icons';
import { sendChatMessage, generateImageWithNano, engineerPrompt } from './geminiService';

// --- AUTH HELPER (LOCAL STORAGE DB) ---
const getStoredAuth = () => {
    try {
        const data = localStorage.getItem('ai_amar_auth_db');
        return data ? JSON.parse(data) : {};
    } catch { return {}; }
};
const saveAuth = (phone: string, pass: string, name: string) => {
    const db = getStoredAuth();
    db[phone] = { password: pass, name: name };
    localStorage.setItem('ai_amar_auth_db', JSON.stringify(db));
};

const App: React.FC = () => {
  // --- STATE ---
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  
  const [user, setUser] = useState<UserState>({ 
      isLoggedIn: false, 
      trials: { CHAT: 0, IMAGE_GEN: 0, PROMPT_ENG: 0 } 
  });
  
  // Chat Data
  const [currentSessionId, setCurrentSessionId] = useState<string>('default');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Inputs
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  
  // UI Controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('REGISTER');
  
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedUser = localStorage.getItem('ai_amar_user');
    const savedSessions = localStorage.getItem('ai_amar_sessions');
    
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }
    if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_amar_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (messages.length > 0 && view === ViewState.APP) {
        saveSession();
        scrollToBottom();
    }
  }, [messages]);

  // --- HELPERS ---
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const saveSession = () => {
    const updatedSessions = [...sessions];
    const index = updatedSessions.findIndex(s => s.id === currentSessionId);
    
    const lastMsg = messages[messages.length - 1];
    let preview = '...';
    if(lastMsg) {
        preview = lastMsg.attachment ? `📎 ${lastMsg.attachment.type}` : lastMsg.text.substring(0, 30) + '...';
    }
    
    const sessionData: ChatSession = {
        id: currentSessionId,
        mode: activeMode,
        title: index >= 0 ? updatedSessions[index].title : (activeMode === AppMode.IMAGE_GEN ? 'ورشة صور' : 'محادثة جديدة'),
        preview,
        date: new Date().toLocaleDateString('ar-EG'),
        messages
    };

    if (index >= 0) updatedSessions[index] = sessionData;
    else updatedSessions.unshift(sessionData);

    setSessions(updatedSessions);
    localStorage.setItem('ai_amar_sessions', JSON.stringify(updatedSessions));
  };

  const checkAccess = (mode: AppMode) => {
      // Allow 1 free trial per mode if not logged in
      if (!user.isLoggedIn && user.trials[mode] >= 1) {
          setShowAuthModal(true);
          setAuthMode('REGISTER'); // Default to register view when forced
          return false;
      }
      return true;
  };

  const startApp = (mode: AppMode) => {
    if (!checkAccess(mode)) return;

    setActiveMode(mode);
    setMessages([]);
    setInput('');
    setAttachment(null);
    setCurrentSessionId(Date.now().toString());
    setView(ViewState.APP);
    setIsSidebarOpen(false);
  };

  const loadSession = (session: ChatSession) => {
      setActiveMode(session.mode);
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setView(ViewState.APP);
      setIsSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      localStorage.setItem('ai_amar_sessions', JSON.stringify(updated));
      if (currentSessionId === id && view === ViewState.APP) {
          setView(ViewState.DASHBOARD);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
            setAttachment({
                name: file.name,
                type: file.type || 'application/octet-stream',
                data: "", 
                dataUrl: event.target.result as string
            });
          }
      };
      reader.readAsDataURL(file);
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- AUTH ACTIONS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'REGISTER') {
        saveAuth(authForm.phone, authForm.password, authForm.name);

        const newUser = { 
            isLoggedIn: true, 
            name: authForm.name, 
            phone: authForm.phone,
            trials: user.trials
        };
        setUser(newUser);
        setShowAuthModal(false);

        // Send Email via EmailJS
        const emailData = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
                from_name: authForm.name,
                phone: authForm.phone,
            }
        };

        try {
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
            });
            alert(`تم التسجيل بنجاح!`);
        } catch (error) {
            console.error("Email Error", error);
        }

    } else {
        // LOGIN
        const db = getStoredAuth();
        const storedUser = db[authForm.phone];

        if (storedUser && storedUser.password === authForm.password) {
             const newUser = { 
                isLoggedIn: true, 
                name: storedUser.name, 
                phone: authForm.phone,
                trials: user.trials
            };
            setUser(newUser);
            setShowAuthModal(false);
            
             // Optional: Alert developer on login
             const emailData = {
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                    from_name: storedUser.name + " (تسجيل دخول)",
                    phone: authForm.phone,
                }
            };
            fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailData)
            }).catch(e => console.log(e));

        } else {
            alert("بيانات الدخول غير صحيحة! تأكد من رقم الهاتف وكلمة المرور.");
        }
    }
  };

  // --- CHAT ACTIONS ---
  const handleSendMessage = async () => {
    const textToSend = input;
    if ((!textToSend.trim() && !attachment) || isLoading) return;

    if (!checkAccess(activeMode)) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      attachment: attachment || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    if (!user.isLoggedIn) {
        setUser(prev => ({
            ...prev,
            trials: { ...prev.trials, [activeMode]: prev.trials[activeMode] + 1 }
        }));
    }

    try {
        let response;
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));

        if (activeMode === AppMode.CHAT) {
            response = await sendChatMessage(textToSend, history, newMessage.attachment);
        } 
        else if (activeMode === AppMode.IMAGE_GEN) {
            // Smart Editing Logic
            let effectiveAttachment = newMessage.attachment;
            if (!effectiveAttachment && messages.length > 0) {
                 const lastModelImage = messages.slice().reverse().find(m => m.role === 'model' && m.attachment);
                 if (lastModelImage && lastModelImage.attachment) {
                     effectiveAttachment = lastModelImage.attachment;
                 }
            }
            response = await generateImageWithNano(textToSend, history, effectiveAttachment);
        } 
        else if (activeMode === AppMode.PROMPT_ENG) {
            response = await engineerPrompt(textToSend, history, newMessage.attachment);
        } else {
             response = { text: "Error: Unknown Mode" };
        }

        const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            timestamp: Date.now(),
            attachment: response.generatedImage ? {
                name: "generated-image.png",
                type: "image/png",
                data: "",
                dataUrl: response.generatedImage
            } : undefined,
            suggestedPrompt: response.suggestedPrompt,
        };
        setMessages(prev => [...prev, botMessage]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "حدث خطأ أثناء المعالجة.. يرجى المحاولة مرة أخرى.",
            isError: true,
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const transferToImageGen = (prompt: string) => {
      const cleanPrompt = prompt.replace(/```text|```/g, '').trim();
      setActiveMode(AppMode.IMAGE_GEN);
      setMessages([]); 
      setCurrentSessionId(Date.now().toString());
      setInput(cleanPrompt);
  };

  // --- RENDERING HELPERS ---
  const getBackground = () => {
      if (view === ViewState.DASHBOARD) return BG_HOME;
      if (activeMode === AppMode.IMAGE_GEN) return BG_IMAGE_GEN;
      return BG_CHAT;
  };

  const getThemeColor = () => {
      if (activeMode === AppMode.IMAGE_GEN) return 'text-nano border-nano shadow-[0_0_15px_#F4E04D]';
      if (activeMode === AppMode.PROMPT_ENG) return 'text-purple-400 border-purple-400 shadow-[0_0_15px_#A855F7]';
      return 'text-blue-400 border-blue-400 shadow-[0_0_15px_#60A5FA]';
  };

  const FooterCredit = () => (
      <div className="w-full text-center py-4 mt-auto z-50">
          <p className="text-[10px] md:text-xs text-white/50 tracking-widest uppercase">
              Developed by <a href={`https://wa.me/${DEVELOPER_PHONE}`} target="_blank" className="font-extrabold text-gold text-sm md:text-base hover:text-white hover:underline transition-all mx-1 drop-shadow-md">AMAR</a>
          </p>
      </div>
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white bg-black font-sans">
        
        {/* Dynamic Background with Fade Adjustment */}
        <div 
            className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-1000"
            style={{ backgroundImage: `url(${getBackground()})` }}
        ></div>
        
        {/* Adjusted Gradient Overlay: MUCH LIGHTER TOP to show face */}
        <div className={`absolute inset-0 z-0 ${view === ViewState.DASHBOARD ? 'bg-gradient-to-b from-transparent via-black/10 to-black/90' : 'bg-black/80'}`}></div>

        {/* --- AUTH MODAL --- */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                 <div className="glass-card p-8 rounded-3xl w-full max-w-md text-center border-t border-white/20 shadow-2xl relative animate-fade-in">
                    <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                    <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-gold/50 mb-4">
                        <img src={APP_ICON_URL} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex rounded-xl bg-black/40 p-1 mb-6 border border-white/10">
                        <button 
                            onClick={() => setAuthMode('REGISTER')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'REGISTER' ? 'bg-gold text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            إنشاء حساب
                        </button>
                        <button 
                            onClick={() => setAuthMode('LOGIN')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'LOGIN' ? 'bg-gold text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            تسجيل دخول
                        </button>
                    </div>

                    <h2 className="text-xl font-bold mb-2 text-white">
                        {authMode === 'REGISTER' ? 'انتهت التجربة المجانية' : 'أهلاً بك مجدداً'}
                    </h2>
                    <p className="text-white/60 text-xs mb-6">
                        {authMode === 'REGISTER' 
                         ? 'سجل بياناتك مرة واحدة فقط لتكمل استخدام التطبيق بلا حدود.' 
                         : 'أدخل رقم هاتفك وكلمة المرور للمتابعة.'}
                    </p>

                     <form onSubmit={handleAuthSubmit} className="space-y-4 text-right">
                        {authMode === 'REGISTER' && (
                            <input type="text" placeholder="الاسم بالكامل" required className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white text-right font-bold placeholder-white/30 focus:border-gold outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                        )}
                        <input type="tel" placeholder="رقم الهاتف" required className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white text-right font-bold placeholder-white/30 focus:border-gold outline-none" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                        <input type="password" placeholder="كلمة المرور" required className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white text-right font-bold placeholder-white/30 focus:border-gold outline-none" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                        
                        <button type="submit" className="w-full bg-gold text-black py-4 rounded-xl font-extrabold hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                            {authMode === 'REGISTER' ? 'تسجيل وتفعيل' : 'دخول'}
                        </button>
                    </form>
                 </div>
            </div>
        )}

        {/* --- 2. DASHBOARD (MAIN INTERFACE) --- */}
        {view === ViewState.DASHBOARD && (
            <div className="relative z-40 h-full flex flex-col p-6 animate-slide-up">
                
                {/* Header Section - Moved Down using Margin Top to Reveal Background Face */}
                {/* Removed the circular Avatar image to stop blocking the face */}
                <div className="text-center mt-[35vh] md:mt-[40vh] mb-8">
                    <h2 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight drop-shadow-2xl">
                        <span className="bg-gradient-to-r from-blue-400 via-purple-300 to-gold bg-clip-text text-transparent">AMAR</span>
                        <span className="text-white">.AI</span>
                    </h2>
                    <p className="text-white/60 tracking-[0.5em] mt-2 uppercase text-[10px] md:text-xs font-bold shadow-black drop-shadow-md">
                        THE FUTURE INTERFACE
                    </p>
                </div>

                {/* Cards Container - Minimalist Layout with Colored Accents (No Icons) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mx-auto flex-1 overflow-y-auto pb-10 px-2 no-scrollbar">
                    
                    {/* Chat Card - Blue Theme */}
                    <div onClick={() => startApp(AppMode.CHAT)} className="glass-card group relative p-6 rounded-2xl cursor-pointer hover:bg-blue-900/10 transition-all duration-500 overflow-hidden border border-white/5 hover:border-blue-500/50 shadow-lg hover:shadow-blue-500/20">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 blur-3xl rounded-full group-hover:bg-blue-500/40 transition-all"></div>
                        <div className="relative z-10 flex flex-col h-full justify-center">
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">محادثة ذكية</h3>
                            <p className="text-white/40 text-xs font-light">مساعد شخصي متكامل</p>
                            <div className="w-full h-[1px] bg-gradient-to-l from-blue-500 to-transparent mt-4 opacity-30 group-hover:opacity-100 transition-all"></div>
                        </div>
                    </div>

                    {/* Image Gen Card - Yellow/Nano Theme */}
                    <div onClick={() => startApp(AppMode.IMAGE_GEN)} className="glass-card group relative p-6 rounded-2xl cursor-pointer hover:bg-yellow-900/10 transition-all duration-500 overflow-hidden border border-white/5 hover:border-nano/50 shadow-lg hover:shadow-nano/20">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-nano/20 blur-3xl rounded-full group-hover:bg-nano/40 transition-all"></div>
                        <div className="relative z-10 flex flex-col h-full justify-center">
                             <h3 className="text-xl font-bold text-white mb-1 group-hover:text-nano transition-colors">استوديو الصور</h3>
                             <p className="text-white/40 text-xs font-light">توليد وتعديل احترافي</p>
                             <div className="w-full h-[1px] bg-gradient-to-l from-nano to-transparent mt-4 opacity-30 group-hover:opacity-100 transition-all"></div>
                        </div>
                    </div>

                    {/* Prompt Eng Card - Purple Theme */}
                    <div onClick={() => startApp(AppMode.PROMPT_ENG)} className="glass-card group relative p-6 rounded-2xl cursor-pointer hover:bg-purple-900/10 transition-all duration-500 overflow-hidden border border-white/5 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/20 blur-3xl rounded-full group-hover:bg-purple-500/40 transition-all"></div>
                        <div className="relative z-10 flex flex-col h-full justify-center">
                             <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">هندسة الأوامر</h3>
                             <p className="text-white/40 text-xs font-light">صياغة برومبت دقيق</p>
                             <div className="w-full h-[1px] bg-gradient-to-l from-purple-500 to-transparent mt-4 opacity-30 group-hover:opacity-100 transition-all"></div>
                        </div>
                    </div>

                    {/* Medical Card - Green Theme */}
                    <a href={MEDICAL_LINK} target="_blank" className="glass-card group relative p-6 rounded-2xl cursor-pointer hover:bg-green-900/10 transition-all duration-500 overflow-hidden border border-white/5 hover:border-green-500/50 shadow-lg hover:shadow-green-500/20">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/20 blur-3xl rounded-full group-hover:bg-green-500/40 transition-all"></div>
                         <div className="relative z-10 flex flex-col h-full justify-center">
                             <h3 className="text-xl font-bold text-white mb-1 group-hover:text-green-300 transition-colors">المساعد الطبي</h3>
                             <p className="text-white/40 text-xs font-light">استشارات طبية</p>
                             <div className="w-full h-[1px] bg-gradient-to-l from-green-500 to-transparent mt-4 opacity-30 group-hover:opacity-100 transition-all"></div>
                        </div>
                    </a>

                    {/* Religious Card - Teal Theme */}
                    <a href={RELIGIOUS_LINK} target="_blank" className="glass-card group relative p-6 rounded-2xl cursor-pointer hover:bg-teal-900/10 transition-all duration-500 overflow-hidden border border-white/5 hover:border-teal-500/50 shadow-lg hover:shadow-teal-500/20">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/20 blur-3xl rounded-full group-hover:bg-teal-500/40 transition-all"></div>
                         <div className="relative z-10 flex flex-col h-full justify-center">
                             <h3 className="text-xl font-bold text-white mb-1 group-hover:text-teal-300 transition-colors">القسم الديني</h3>
                             <p className="text-white/40 text-xs font-light">أذكار إسلامية</p>
                             <div className="w-full h-[1px] bg-gradient-to-l from-teal-500 to-transparent mt-4 opacity-30 group-hover:opacity-100 transition-all"></div>
                        </div>
                    </a>

                </div>
                <FooterCredit />
            </div>
        )}

        {/* --- 3. APP VIEW --- */}
        {view === ViewState.APP && (
            <div className="relative z-40 flex h-full flex-col md:flex-row">
                {/* Mobile Header */}
                <div className="md:hidden h-16 bg-black/60 backdrop-blur-md flex items-center justify-between px-4 border-b border-white/10 shrink-0">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-white"><MenuIcon /></button>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border bg-black/40 ${getThemeColor()}`}>
                        {activeMode === AppMode.IMAGE_GEN ? 'NANO STUDIO' : activeMode === AppMode.PROMPT_ENG ? 'PROMPT MASTER' : 'AMAR CHAT'}
                    </span>
                    <button onClick={() => setView(ViewState.DASHBOARD)} className="bg-white/10 p-2 rounded-full text-[10px] font-bold">الرئيسية</button>
                </div>

                {/* Sidebar */}
                <aside className={`
                    fixed inset-y-0 right-0 z-50 w-80 bg-[#050505]/95 backdrop-blur-xl border-l border-white/10 transform transition duration-500 shadow-2xl
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 flex flex-col
                `}>
                     <div className="p-6 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView(ViewState.DASHBOARD)}>
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-gold group-hover:text-black transition">
                                <span className="font-bold text-lg">🏠</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-white">الرئيسية</span>
                                <span className="text-[10px] text-white/40">العودة للوحة التحكم</span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/50 text-xl">✕</button>
                     </div>

                     <div className="px-6 my-6">
                        <button onClick={() => startApp(activeMode)} className="w-full py-4 rounded-xl bg-gradient-to-r from-white/10 to-white/5 hover:from-gold hover:to-yellow-500 hover:text-black flex items-center justify-center gap-3 text-sm font-bold border border-white/10 transition-all shadow-lg group">
                            <PlusIcon /> 
                            <span>جلسة جديدة</span>
                        </button>
                     </div>

                     <div className="flex-1 overflow-y-auto px-4 space-y-3">
                        <h4 className="text-xs font-bold text-white/30 px-2 mb-2 uppercase tracking-widest">السجل</h4>
                        {sessions.filter(s => s.mode === activeMode).map(s => (
                            <div key={s.id} onClick={() => loadSession(s)} className={`p-4 rounded-xl cursor-pointer flex items-center justify-between group transition-all ${currentSessionId === s.id ? 'bg-white/10 border-r-2 border-gold' : 'hover:bg-white/5 border-r-2 border-transparent'}`}>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate text-sm font-bold text-white/90 mb-1">{s.title}</span>
                                    <span className="truncate text-[10px] text-white/50">{s.preview}</span>
                                </div>
                                <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition"><TrashIcon /></button>
                            </div>
                        ))}
                     </div>
                     <FooterCredit />
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col relative h-full overflow-hidden">
                    
                    {/* Desktop Header */}
                    <header className="hidden md:flex h-20 px-8 items-center justify-between bg-black/20 backdrop-blur-md border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-4">
                            <span className={`text-sm font-extrabold px-4 py-2 rounded-lg border bg-black/50 backdrop-blur-md ${getThemeColor()}`}>
                                {activeMode === AppMode.IMAGE_GEN ? '🍌 NANO STUDIO' : activeMode === AppMode.PROMPT_ENG ? '✨ PROMPT MASTER' : '💬 AMAR CHAT'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setView(ViewState.DASHBOARD)} 
                            className="text-xs font-bold text-white/70 hover:text-gold border border-white/10 hover:border-gold px-4 py-2 rounded-lg transition"
                        >
                            الرجوع للرئيسية ↩
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 pointer-events-none">
                                <img src={APP_ICON_URL} className="w-20 h-20 rounded-full mb-4 grayscale" />
                                <p className="text-sm font-mono">ابدأ المحادثة الآن...</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                                <div className={`
                                    max-w-[90%] md:max-w-[70%] p-5 rounded-3xl relative text-sm md:text-base leading-relaxed shadow-lg backdrop-blur-sm
                                    ${msg.role === 'user' 
                                        ? 'bg-white/10 text-white rounded-br-none border border-white/20' 
                                        : 'glass-card text-gray-100 rounded-bl-none border-t border-white/10'}
                                `}>
                                    {msg.attachment && (
                                        <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-md relative group">
                                            {/* WATERMARK OVERLAY */}
                                            {msg.attachment.name === "generated-image.png" && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/70 font-mono border border-white/10 z-10 pointer-events-none backdrop-blur-sm">
                                                    AMAR script
                                                </div>
                                            )}
                                            
                                            {msg.attachment.type.startsWith('image') ? (
                                                <img src={msg.attachment.dataUrl} className="w-full h-auto object-cover" />
                                            ) : (
                                                <div className="p-4 bg-white/5 flex items-center gap-3">
                                                    <PaperClipIcon />
                                                    <span className="text-xs truncate">{msg.attachment.name}</span>
                                                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded">{msg.attachment.type}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="whitespace-pre-wrap font-sans" dir="auto">
                                        {msg.text.split('```').map((part, index) => {
                                            if (index % 2 === 1) {
                                                return (
                                                    <div key={index} className="relative mt-2 mb-2 group">
                                                        <div className="bg-black/80 p-4 rounded-lg border border-gold/30 text-gold font-mono text-xs md:text-sm overflow-x-auto">
                                                            {part}
                                                        </div>
                                                        <button 
                                                            onClick={() => {navigator.clipboard.writeText(part); alert('تم النسخ!');}}
                                                            className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-gold hover:text-black rounded text-white transition"
                                                            title="نسخ"
                                                        >
                                                            <CopyIcon />
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return <span key={index}>{part}</span>;
                                        })}
                                    </div>
                                    
                                    {msg.suggestedPrompt && (
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <button 
                                                onClick={() => transferToImageGen(msg.suggestedPrompt!)}
                                                className="w-full py-3 bg-nano text-black font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-[0_0_15px_#F4E04D]"
                                            >
                                                <PaletteIcon />
                                                <span>إنشاء الصورة بهذا البرومبت</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] text-white/30 mt-2 px-1">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">⏳</div>
                                <div className="glass-card px-4 py-2 rounded-xl rounded-bl-none text-xs text-white/50">
                                    جاري التحليل والكتابة...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 bg-black/80 backdrop-blur-xl border-t border-white/5 z-20">
                        <div className={`
                            glass-card rounded-2xl p-2 flex items-center gap-3 transition-all duration-300
                            ${activeMode === AppMode.IMAGE_GEN ? 'border-nano/50 shadow-[0_0_10px_rgba(244,224,77,0.1)]' : 'border-white/10'}
                        `}>
                             {attachment && (
                                <div className="relative h-14 shrink-0 flex items-center bg-white/10 rounded-xl px-2">
                                    {attachment.type.startsWith('image') ? (
                                        <img src={attachment.dataUrl} className="h-full w-14 object-cover rounded-lg" />
                                    ) : (
                                        <PaperClipIcon />
                                    )}
                                    <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center border border-black">✕</button>
                                </div>
                            )}
                            
                            {(activeMode === AppMode.CHAT || activeMode === AppMode.IMAGE_GEN || activeMode === AppMode.PROMPT_ENG) && (
                                <>
                                    <input 
                                        type="file" 
                                        id="up" 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload} 
                                        accept="*/*" 
                                    />
                                    <label htmlFor="up" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-gold cursor-pointer transition">
                                        <PaperClipIcon />
                                    </label>
                                </>
                            )}
                            
                            <textarea 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={activeMode === AppMode.PROMPT_ENG ? "ارفع صورة أو اكتب فكرتك..." : activeMode === AppMode.IMAGE_GEN ? "اوصف الصورة..." : "اكتب رسالة أو ارفع ملف..."}
                                className="flex-1 bg-transparent outline-none text-white placeholder-white/30 px-2 py-3 max-h-32 resize-none text-right font-medium"
                                rows={1}
                            />
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || (!input.trim() && !attachment)}
                                className={`
                                    p-4 rounded-xl transition-all duration-300
                                    ${(!input.trim() && !attachment) ? 'bg-white/5 text-white/20' : 
                                      activeMode === AppMode.IMAGE_GEN ? 'bg-nano text-black hover:scale-105 shadow-[0_0_15px_#F4E04D]' : 
                                      'bg-white text-black hover:bg-gold hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]'}
                                `}
                            >
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
