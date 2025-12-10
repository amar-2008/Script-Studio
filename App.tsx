
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Message, UserState, ChatSession, AppMode, Attachment } from './types';
import { APP_ICON_URL, MEDICAL_LINK, RELIGIOUS_LINK, BG_HOME, BG_CHAT, BG_CODING, BG_PROMPT, DEVELOPER_PHONE, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, GEMINI_GEM_LINK } from './constants';
import { SendIcon, PaperClipIcon, TrashIcon, CopyIcon, MenuIcon, PlusIcon, PaletteIcon } from './Icons';
import { sendChatMessage, generateCodeAssistant, engineerPrompt } from './geminiService';

const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

// --- AUTH HELPER ---
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
      trials: { CHAT: 0, CODING: 0, PROMPT_ENG: 0 } 
  });
  
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

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedUser = localStorage.getItem('ai_amar_user');
    const savedSessions = localStorage.getItem('ai_amar_sessions');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
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
        title: index >= 0 ? updatedSessions[index].title : (activeMode === AppMode.CODING ? 'كود جديد' : 'محادثة جديدة'),
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
      if (!user.isLoggedIn && user.trials[mode] >= 2) { 
          setShowAuthModal(true);
          setAuthMode('REGISTER');
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'REGISTER') {
        saveAuth(authForm.phone, authForm.password, authForm.name);
        const newUser = { isLoggedIn: true, name: authForm.name, phone: authForm.phone, trials: user.trials };
        setUser(newUser);
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
            alert(`تم التسجيل بنجاح!`);
        } catch (error) { console.error("Email Error", error); }
    } else {
        const db = getStoredAuth();
        const storedUser = db[authForm.phone];
        if (storedUser && storedUser.password === authForm.password) {
             const newUser = { isLoggedIn: true, name: storedUser.name, phone: authForm.phone, trials: user.trials };
            setUser(newUser);
            setShowAuthModal(false);
        } else {
            alert("بيانات الدخول غير صحيحة!");
        }
    }
  };

  // --- CHAT LOGIC ---
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
        // Construct history carefully to include images so model can see previous images
        const history = messages.map(m => {
            const parts: any[] = [{ text: m.text }];
            if (m.attachment && m.attachment.dataUrl) {
                // Ensure we pass the image data if it exists in history
                parts.unshift({
                    inlineData: {
                        mimeType: m.attachment.type,
                        data: cleanBase64(m.attachment.dataUrl)
                    }
                });
            }
            return { role: m.role, parts };
        });

        if (activeMode === AppMode.CHAT) {
            response = await sendChatMessage(textToSend, history, newMessage.attachment);
        } 
        else if (activeMode === AppMode.CODING) {
            response = await generateCodeAssistant(textToSend, history, newMessage.attachment);
        } 
        else if (activeMode === AppMode.PROMPT_ENG) {
            response = await engineerPrompt(textToSend, history, newMessage.attachment);
        } else {
             response = { text: "Error" };
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
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "حدث خطأ أثناء المعالجة..",
            isError: true,
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const openGeminiGem = (prompt: string) => {
      const clean = prompt.replace(/```text|```/g, '').trim();
      navigator.clipboard.writeText(clean);
      // New Logic: Just copy and open
      window.open(GEMINI_GEM_LINK, '_blank');
  };

  const getBackground = () => {
      if (view === ViewState.DASHBOARD) return BG_HOME;
      if (activeMode === AppMode.CODING) return BG_CODING;
      if (activeMode === AppMode.PROMPT_ENG) return BG_PROMPT;
      return BG_CHAT;
  };

  const getThemeColor = () => 'text-gold border-gold shadow-[0_0_10px_#FFD700]';

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white bg-black font-sans">
        
        {/* BACKGROUND LAYER */}
        <div 
            className="absolute inset-0 bg-cover bg-[center_top] z-0 transition-all duration-700"
            style={{ backgroundImage: `url(${getBackground()})` }}
        ></div>
        
        {/* OVERLAY - COMPLETELY TRANSPARENT AT TOP, DARK AT BOTTOM */}
        <div className={`absolute inset-0 z-0 transition-all duration-700 ${
            view === ViewState.DASHBOARD 
            ? 'bg-gradient-to-b from-transparent via-transparent to-black' 
            : 'bg-black/40' 
        }`}></div>

        {/* AUTH MODAL */}
        {showAuthModal && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                 <div className="glass-card p-8 rounded-3xl w-full max-w-md text-center border border-gold/30 shadow-[0_0_50px_rgba(255,215,0,0.1)] relative">
                    <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                    <h2 className="text-2xl font-bold mb-4 text-gold font-display">AMAR ACCESS</h2>
                     <form onSubmit={handleAuthSubmit} className="space-y-4 text-right">
                        {authMode === 'REGISTER' && <input type="text" placeholder="الاسم" required className="auth-input" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
                        <input type="tel" placeholder="رقم الهاتف" required className="auth-input" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                        <input type="password" placeholder="كلمة المرور" required className="auth-input" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                        <button type="submit" className="w-full bg-gold text-black py-3 rounded-xl font-bold hover:brightness-110 transition-all">{authMode === 'REGISTER' ? 'تفعيل الحساب' : 'دخول'}</button>
                    </form>
                    <div className="mt-4 flex gap-2 justify-center text-xs text-white/50">
                        <button onClick={() => setAuthMode('REGISTER')} className={authMode === 'REGISTER' ? 'text-gold' : ''}>إنشاء حساب</button>
                        <span>|</span>
                        <button onClick={() => setAuthMode('LOGIN')} className={authMode === 'LOGIN' ? 'text-gold' : ''}>دخول</button>
                    </div>
                 </div>
            </div>
        )}

        {/* DASHBOARD - BOTTOM DOCK LAYOUT (Allows Face Visibility) */}
        {view === ViewState.DASHBOARD && (
            <div className="relative z-40 h-full flex flex-col justify-end p-6 animate-fade-in">
                
                <div className="mb-auto mt-10 ml-4 md:ml-20">
                    {/* Empty top space for face */}
                </div>

                {/* Bottom Dock Menu */}
                <div className="w-full max-w-5xl mx-auto mb-8">
                     <h1 className="text-5xl md:text-7xl font-display font-black text-white/90 drop-shadow-xl mb-6 text-center md:text-left">
                        AMAR<span className="text-gold">.AI</span>
                    </h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div onClick={() => startApp(AppMode.CHAT)} className="group h-24 bg-black/40 hover:bg-gold hover:text-black backdrop-blur-md border border-white/10 hover:border-gold rounded-xl flex items-center px-6 cursor-pointer transition-all duration-300">
                            <span className="text-3xl ml-4 opacity-70 group-hover:opacity-100">💬</span>
                            <div>
                                <h3 className="text-lg font-bold">محادثة ذكية</h3>
                                <p className="text-[10px] opacity-60 uppercase tracking-widest">Personal Assistant</p>
                            </div>
                        </div>

                        <div onClick={() => startApp(AppMode.PROMPT_ENG)} className="group h-24 bg-black/40 hover:bg-gold hover:text-black backdrop-blur-md border border-white/10 hover:border-gold rounded-xl flex items-center px-6 cursor-pointer transition-all duration-300">
                             <span className="text-3xl ml-4 opacity-70 group-hover:opacity-100">✨</span>
                             <div>
                                <h3 className="text-lg font-bold">هندسة الأوامر</h3>
                                <p className="text-[10px] opacity-60 uppercase tracking-widest">Gemini Studio Link</p>
                            </div>
                        </div>

                        <div onClick={() => startApp(AppMode.CODING)} className="group h-24 bg-black/40 hover:bg-gold hover:text-black backdrop-blur-md border border-white/10 hover:border-gold rounded-xl flex items-center px-6 cursor-pointer transition-all duration-300">
                             <span className="text-3xl ml-4 opacity-70 group-hover:opacity-100">💻</span>
                             <div>
                                <h3 className="text-lg font-bold">خبير الأكواد</h3>
                                <p className="text-[10px] opacity-60 uppercase tracking-widest">Coding Master</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-3">
                         <a href={MEDICAL_LINK} target="_blank" className="flex-1 py-3 bg-black/20 hover:bg-white/10 border border-white/5 rounded-lg text-center text-xs text-white/60 hover:text-white transition-all">القسم الطبي +</a>
                         <a href={RELIGIOUS_LINK} target="_blank" className="flex-1 py-3 bg-black/20 hover:bg-white/10 border border-white/5 rounded-lg text-center text-xs text-white/60 hover:text-white transition-all">القسم الديني +</a>
                    </div>
                </div>
            </div>
        )}

        {/* APP VIEW */}
        {view === ViewState.APP && (
            <div className="relative z-40 flex h-full flex-col md:flex-row animate-fade-in">
                {/* Mobile Top Bar */}
                <div className="md:hidden h-16 bg-black/20 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 border-b border-white/5">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-white"><MenuIcon /></button>
                    <span className="text-xs font-bold px-3 py-1 rounded border border-gold/50 text-gold bg-black/40">
                        {activeMode === AppMode.CODING ? 'CODE MASTER' : activeMode === AppMode.PROMPT_ENG ? 'PROMPT MASTER' : 'AMAR CHAT'}
                    </span>
                    <button onClick={() => setView(ViewState.DASHBOARD)} className="text-xs text-white/60">خروج</button>
                </div>

                {/* Sidebar */}
                <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-black/90 border-l border-white/10 transform transition duration-500 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
                     <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-xl font-display font-bold text-gold">AMAR.AI</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/50">✕</button>
                     </div>
                     <div className="p-4">
                        <button onClick={() => startApp(activeMode)} className="w-full py-3 bg-white/5 hover:bg-gold hover:text-black border border-white/10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                            <PlusIcon /> جلسة جديدة
                        </button>
                     </div>
                     <div className="flex-1 overflow-y-auto px-4 space-y-2">
                        {sessions.filter(s => s.mode === activeMode).map(s => (
                            <div key={s.id} onClick={() => loadSession(s)} className={`p-3 rounded-lg cursor-pointer transition-all border-r-2 ${currentSessionId === s.id ? 'bg-white/10 border-gold' : 'hover:bg-white/5 border-transparent'}`}>
                                <h4 className="text-sm font-bold text-white/90 truncate">{s.title}</h4>
                                <p className="text-[10px] text-white/40 truncate">{s.preview}</p>
                            </div>
                        ))}
                     </div>
                     <button onClick={() => setView(ViewState.DASHBOARD)} className="p-4 text-xs text-center text-white/30 hover:text-white transition-colors border-t border-white/5">العودة للرئيسية</button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <img src={APP_ICON_URL} className="w-24 h-24 rounded-2xl mb-4 grayscale opacity-50" />
                                <p className="text-sm font-light tracking-widest uppercase text-center mt-2">
                                    {activeMode === AppMode.PROMPT_ENG ? 'ارفع صورك لتحليلها' : 'مرحباً بك'}
                                </p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                                <div className={`max-w-[90%] md:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md shadow-lg ${msg.role === 'user' ? 'bg-white/10 border border-white/10 text-white rounded-br-none' : 'bg-black/60 border border-white/5 text-gray-200 rounded-bl-none'}`}>
                                    {msg.attachment && (
                                        <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                                            {msg.attachment.type.startsWith('image') ? <img src={msg.attachment.dataUrl} className="w-full h-auto" /> : <div className="p-2 bg-white/5 flex gap-2"><PaperClipIcon /><span className="text-xs">{msg.attachment.name}</span></div>}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap font-sans" dir="auto">
                                        {msg.text.split('```').map((part, index) => (
                                            index % 2 === 1 ? (
                                                <div key={index} className="my-2 bg-black/80 p-3 rounded border border-gold/20 text-xs md:text-sm font-mono overflow-x-auto relative group">
                                                    <button onClick={() => {navigator.clipboard.writeText(part); alert('تم النسخ');}} className="absolute top-2 right-2 text-white/30 hover:text-gold"><CopyIcon /></button>
                                                    <span className="text-gold/80">{part}</span>
                                                </div>
                                            ) : <span key={index}>{part}</span>
                                        ))}
                                    </div>
                                    {msg.suggestedPrompt && (
                                        <button onClick={() => openGeminiGem(msg.suggestedPrompt!)} className="mt-3 w-full py-3 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-white/10 hover:border-gold text-white rounded-lg text-xs font-bold hover:brightness-125 transition-all flex items-center justify-center gap-2 shadow-lg">
                                            <PaletteIcon />
                                            <span>نسخ البرومبت والذهاب إلى Gemini Studio ↗</span>
                                        </button>
                                    )}
                                </div>
                                <span className="text-[9px] text-white/40 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        ))}
                        {isLoading && <div className="text-center text-xs text-white/30 animate-pulse">جاري التحليل...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-black/60 backdrop-blur-md border-t border-white/5">
                        <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-gold/50 rounded-xl p-2 transition-all">
                            {attachment && (
                                <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/80 rounded-lg border border-white/10 flex items-center gap-2">
                                    <span className="text-xs max-w-[100px] truncate">{attachment.name}</span>
                                    <button onClick={() => setAttachment(null)} className="text-red-500 hover:text-white">✕</button>
                                </div>
                            )}
                            
                            <input type="file" id="up" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            <label htmlFor="up" className="p-2 text-white/50 hover:text-gold cursor-pointer"><PaperClipIcon /></label>
                            
                            <textarea 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSendMessage();}}}
                                placeholder={activeMode === AppMode.PROMPT_ENG ? "ارفع صورة (أو أكثر) واكتب فكرتك..." : "اكتب رسالتك..."}
                                className="flex-1 bg-transparent outline-none text-white text-right placeholder-white/30 resize-none max-h-32 text-sm"
                                rows={1}
                            />
                            
                            <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && !attachment)} className="p-2 bg-white/10 hover:bg-gold hover:text-black rounded-lg text-white transition-all disabled:opacity-50 disabled:hover:bg-white/10 disabled:hover:text-white">
                                <SendIcon />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        )}
        
        <style>{`
            .auth-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; color: white; text-align: right; outline: none; }
            .auth-input:focus { border-color: #FFD700; }
            .glass-card { background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,215,0,0.1); }
        `}</style>
    </div>
  );
};

export default App;
