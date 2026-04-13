import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CalendarPlus, User, Clock, Edit, Trash2, Plus, Calendar, ChevronRight, X, Search, Filter, Lock, LogOut, Settings, UserPlus, Shield, Loader2, Download, Upload, Link as LinkIcon, Users, Phone, MessageCircle, Tent, Compass, TreePine, Flame, Map as MapIcon, History, Globe } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// --- 您的專屬 Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyCuM9FpCPeqnC_k-WPpPw2w2oRUmFjwUmg",
  authDomain: "skills-share-ea7c5.firebaseapp.com",
  projectId: "skills-share-ea7c5",
  storageBucket: "skills-share-ea7c5.firebasestorage.app",
  messagingSenderId: "682856386665",
  appId: "1:682856386665:web:9ed652427805b88bb612f8"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 初始種子資料
const initialCategories = ['訓練', '樂齡', '證照', '資訊', '才藝', '音樂', '家政', '其他'];
const initialAdmins = [
  { username: 'admin666', password: '123456', isDefault: true }
];

// --- 輔助函式 ---
const getGoogleCalendarLink = (course) => {
  const formatTime = (timeStr) => timeStr.replace(/[-:]/g, '') + '00';
  if(!course.startTime || !course.endTime) return '#';
  const start = formatTime(course.startTime);
  const end = formatTime(course.endTime);
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', course.title || '');
  url.searchParams.append('dates', `${start}/${end}`);
  let details = `講師: ${course.instructor || '未定'}\n`;
  if(course.contactLine) details += `Line聯絡: ${course.contactLine}\n`;
  if(course.contactPhone) details += `聯絡電話: ${course.contactPhone}\n`;
  details += `\n課程介紹:\n${course.description || ''}`;
  url.searchParams.append('details', details);
  url.searchParams.append('location', course.location || '');
  return url.toString();
};

const getGoogleMapsLink = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || '')}`;

const formatDisplayTime = (start, end) => {
  if(!start || !end) return '時間未定';
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' })} ${startDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
};

// --- 課程卡片組件 ---
const CourseCard = ({ course }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-md hover:border-[#5A2E8A]/30 transition-all flex flex-col group h-full">
      <div className="p-5 sm:p-6 flex-grow relative">
        <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h3 className="text-lg sm:text-xl font-bold text-[#5A2E8A] pr-2 transition-colors leading-tight">{course.title}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-[#5A2E8A] shrink-0 border border-purple-200">
            {course.category}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">{course.description}</p>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-[#5A2E8A] text-sm font-bold hover:text-[#401b69] flex items-center transition-colors focus:outline-none bg-purple-50 px-3 py-2 rounded-lg w-full justify-center active:scale-95">
          {isExpanded ? '收起詳細資訊' : '查看詳細資訊'}
          <ChevronRight className={`h-4 w-4 ml-1 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
          <div className="space-y-3 text-sm text-gray-600 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center"><User className="h-4 w-4 mr-2 shrink-0 text-[#5A2E8A]/60" /><span className="font-medium text-gray-700">講師：{course.instructor}</span></div>
            <div className="flex items-start"><Clock className="h-4 w-4 mr-2 shrink-0 text-[#5A2E8A]/60 mt-0.5" /><span>{formatDisplayTime(course.startTime, course.endTime)}</span></div>
            <div className="flex items-start"><MapPin className="h-4 w-4 mr-2 shrink-0 text-[#5A2E8A]/60 mt-0.5" /><a href={getGoogleMapsLink(course.location)} target="_blank" rel="noopener noreferrer" className="text-[#5A2E8A] hover:text-[#401b69] hover:underline inline-flex items-center font-medium break-all">{course.location} <ChevronRight className="h-3 w-3 ml-0.5 shrink-0" /></a></div>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-100 space-y-2 mt-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            {course.registrationLink && <a href={course.registrationLink.startsWith('http') ? course.registrationLink : `https://${course.registrationLink}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-[#5A2E8A] hover:bg-[#401b69] transition-colors"><LinkIcon className="h-4 w-4 mr-1" /> 報名連結</a>}
            {course.eventLink && <a href={course.eventLink.startsWith('http') ? course.eventLink : `https://${course.eventLink}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5A2E8A] bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"><LinkIcon className="h-4 w-4 mr-1" /> 活動網站</a>}
          </div>
          <a href={getGoogleCalendarLink(course)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-[#5A2E8A] transition-colors"><CalendarPlus className="h-4 w-4 mr-2" /> 加入行事曆</a>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [view, setView] = useState('user'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ username: '', password: '' });
  const [editingPasswordFor, setEditingPasswordFor] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmOldPassword, setConfirmOldPassword] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: '訓練', instructor: '', startTime: '', endTime: '', location: '', description: '', registrationLink: '', eventLink: '', capacity: '', contactLine: '', contactPhone: '' });
  const [customCategory, setCustomCategory] = useState('');

  // --- 操作紀錄 Log 函式 ---
  const logActivity = async (action, details = "") => {
    try {
      let locationStr = "獲取中...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        locationStr = `${ipData.ip} (${ipData.city}, ${ipData.country_name})`;
      } catch (e) { locationStr = "未知位置 (API限制)"; }

      await addDoc(collection(db, 'logs'), {
        user: currentAdmin || "系統匿名",
        action,
        details,
        location: locationStr,
        timestamp: serverTimestamp()
      });
    } catch (err) { console.error("Log failed:", err); }
  };

  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Auth failed:", error));
    const unsubscribe = onAuthStateChanged(auth, setAuthUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setIsDataLoading(false);
    });
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name);
      if (data.length === 0) initialCategories.forEach(cat => setDoc(doc(db, 'categories', encodeURIComponent(cat)), { name: cat }));
      else setCategories(data);
    });
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length === 0) initialAdmins.forEach(a => setDoc(doc(db, 'admins', a.username), a));
      else setAdmins(data);
    });
    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    return () => { unsubCourses(); unsubCategories(); unsubAdmins(); unsubLogs(); };
  }, [authUser]);

  // 定義事件處理函式
  const handleAdminClick = () => {
    if (isLoggedIn) setView('admin');
    else setShowLoginModal(true);
  };

  const handleLogout = () => {
    logActivity("登出系統");
    setIsLoggedIn(false); setCurrentAdmin(null); setView('user');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const user = admins.find(a => a.username === loginData.username && a.password === loginData.password);
    if (user) {
      setIsLoggedIn(true); 
      setCurrentAdmin(user.username); 
      setShowLoginModal(false); 
      setView('admin'); 
      setLoginError(''); 
      setTimeout(() => logActivity("登入系統", `使用者 ${user.username} 已登入`), 500);
      setLoginData({ username: '', password: '' });
    } else {
      setLoginError('帳號或密碼錯誤');
    }
  };

  const handleAddAdmin = async (e) => { 
    e.preventDefault(); 
    if (admins.length >= 3) return alert('最多只能有三組管理帳號'); 
    if (admins.some(a => a.username === newAccountData.username)) return alert('帳號已存在'); 
    try { 
      await setDoc(doc(db, 'admins', newAccountData.username), { username: newAccountData.username, password: newAccountData.password, isDefault: false }); 
      setNewAccountData({ username: '', password: '' }); 
    } catch (err) { alert('新增失敗'); } 
  };
  
  const handleChangePassword = async (username) => { 
    if (!confirmOldPassword.trim() || !newPasswordValue.trim()) {
      return alert('舊密碼與新密碼皆不能為空');
    }
    const targetAdmin = admins.find(a => a.username === username);
    if (confirmOldPassword !== targetAdmin.password) {
      return alert('舊密碼輸入錯誤，無法修改！');
    }
    try { 
      await setDoc(doc(db, 'admins', username), { password: newPasswordValue }, { merge: true }); 
      setEditingPasswordFor(null); 
      setNewPasswordValue(''); 
      setConfirmOldPassword('');
      alert('密碼修改成功！'); 
    } catch (err) { alert('修改失敗'); } 
  };
  
  const handleDeleteAdmin = async (username) => { 
    if (username === 'admin666') return alert('預設帳號無法刪除'); 
    if (window.confirm(`確定要刪除管理員 ${username} 嗎？`)) { 
      try { 
        await deleteDoc(doc(db, 'admins', username)); 
        if (currentAdmin === username) handleLogout(); 
      } catch (err) { alert('刪除失敗'); } 
    } 
  };

  const handleOpenModal = (course = null) => {
    setCustomCategory('');
    if (course) {
      setEditingId(course.id);
      setFormData({ title: course.title || '', category: course.category || categories[0] || '其他', instructor: course.instructor || '', startTime: course.startTime || '', endTime: course.endTime || '', location: course.location || '', description: course.description || '', registrationLink: course.registrationLink || '', eventLink: course.eventLink || '', capacity: course.capacity || '', contactLine: course.contactLine || '', contactPhone: course.contactPhone || '' });
    } else {
      setEditingId(null);
      setFormData({ title: '', category: categories[0] || '其他', instructor: '', startTime: '', endTime: '', location: '', description: '', registrationLink: '', eventLink: '', capacity: '', contactLine: '', contactPhone: '' });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    let finalCategory = formData.category;
    try {
      if (formData.category === 'custom_new') {
        finalCategory = customCategory.trim();
        await setDoc(doc(db, 'categories', encodeURIComponent(finalCategory)), { name: finalCategory });
      }
      const courseId = editingId || crypto.randomUUID();
      const courseToSave = { 
        ...formData, 
        category: finalCategory,
        createdBy: editingId ? (courses.find(c => c.id === editingId)?.createdBy || currentAdmin) : currentAdmin
      };
      await setDoc(doc(db, 'courses', String(courseId)), courseToSave);
      logActivity(editingId ? "修改課程" : "新增課程", `課程: ${formData.title}`);
      setIsModalOpen(false);
    } catch (err) { alert('儲存失敗'); }
  };

  const handleDelete = async (course) => {
    if (window.confirm(`確定要刪除「${course.title}」嗎？`)) {
      try { 
        await deleteDoc(doc(db, 'courses', String(course.id))); 
        logActivity("刪除課程", `課程: ${course.title}`);
      } catch (err) { alert('刪除失敗'); }
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory ? course.category === filterCategory : true;
    return matchSearch && matchCategory;
  });

  const adminDisplayCourses = filteredCourses.filter(c => currentAdmin === 'admin666' || c.createdBy === currentAdmin);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2 overflow-hidden mr-2">
            <Tent className="h-6 w-6 sm:h-7 sm:w-7 text-[#5A2E8A] shrink-0" />
            <span className="text-base sm:text-lg font-bold truncate">線上童軍營地公開課程交流資訊平台 V2.2版</span>
          </div>
          <div className="flex space-x-1 sm:space-x-2 shrink-0">
            <button onClick={() => setView('user')} className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${view === 'user' ? 'bg-[#5A2E8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>營地佈告欄</button>
            <button onClick={handleAdminClick} className={`px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${view === 'admin' ? 'bg-[#401b69] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>團長後台</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full flex flex-col">
        {view === 'user' && (
          <div className="space-y-6 flex-1">
            <div className="bg-purple-50 p-5 sm:p-8 rounded-2xl border border-purple-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-inner">
              <Compass className="absolute top-2 right-4 h-24 w-24 text-[#5A2E8A] opacity-5 rotate-12 hidden sm:block" />
              <div className="relative z-10">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#5A2E8A] flex items-center"><Flame className="mr-2 text-orange-500 shrink-0 h-6 w-6 sm:h-8 sm:w-8" /> 探索最新課程</h1>
                <p className="text-[#5A2E8A]/70 mt-1 sm:mt-2 font-medium text-sm sm:text-base">尋找感興趣的童軍與公開課程，加入行事曆絕不錯過。</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto relative z-10">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A2E8A]/50" />
                  <input type="text" placeholder="搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2.5 sm:py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-[#5A2E8A] w-full" />
                </div>
                <div className="relative w-full sm:w-auto">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A2E8A]/50" />
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="pl-9 pr-8 py-2.5 sm:py-2 border border-purple-200 rounded-lg text-sm appearance-none bg-white w-full">
                    <option value="">所有分類</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            {filteredCourses.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                 <Tent className="h-16 w-16 text-gray-300 mb-4" />
                 <p className="text-gray-500 text-base sm:text-lg">目前沒有符合條件的課程。</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredCourses.map(course => <CourseCard key={course.id} course={course} />)}
              </div>
            )}
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-6 flex-1">
            {/* 響應式：還原設計圖的「團長後台管理中心」標題與標籤排版 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-5 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#5A2E8A] flex flex-wrap items-center gap-2 sm:gap-3">
                  團長後台管理中心
                  <span className="text-xs sm:text-sm font-normal bg-purple-100 text-[#5A2E8A] px-3 py-1 rounded-full flex items-center border border-purple-200 shadow-sm mt-1 sm:mt-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 目前登入: {currentAdmin}
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-gray-500 mt-2">此處的資料會即時同步至雲端資料庫。</p>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {currentAdmin === 'admin666' && (
                  <button onClick={() => setShowLogModal(true)} className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    <History className="h-4 w-4 mr-1" /> 系統日誌
                  </button>
                )}
                <button onClick={() => setShowAccountModal(true)} className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm"><Settings className="h-4 w-4 mr-1" /> 帳號設定</button>
                <button onClick={handleLogout} className="flex-1 sm:flex-none flex justify-center items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors shadow-sm"><LogOut className="h-4 w-4 mr-1" /> 登出</button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
               <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="搜尋管理課程..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-48 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                  </div>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 text-sm w-full sm:w-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white outline-none">
                    <option value="">所有分類</option>
                    {categories.map((cat, idx) => <option key={`admin-filter-${idx}-${cat}`} value={cat}>{cat}</option>)}
                  </select>
               </div>
               <div className="flex w-full md:w-auto gap-2">
                  <button onClick={() => handleOpenModal()} className="w-full flex justify-center items-center px-4 py-2 bg-[#5A2E8A] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#401b69] transition-colors"><Plus className="h-4 w-4 mr-1" /> 新增課程</button>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">課程名稱 / 分類</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">建立者</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminDisplayCourses.length === 0 && (
                       <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">目前沒有可管理的課程。</td></tr>
                    )}
                    {adminDisplayCourses.map(course => (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 min-w-[200px]">
                          <div className="font-bold text-gray-900 text-sm sm:text-base leading-tight mb-1">{course.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                             <span className="bg-purple-100 text-[#5A2E8A] px-1.5 py-0.5 rounded">{course.category}</span>
                             <span>{formatDisplayTime(course.startTime, course.endTime).split(' - ')[0]}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded text-gray-600 font-medium">{course.createdBy || '系統'}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right space-x-2 sm:space-x-4 whitespace-nowrap">
                          {(course.createdBy === currentAdmin || currentAdmin === 'admin666') ? (
                            <>
                              <button onClick={() => handleOpenModal(course)} className="text-[#5A2E8A] hover:text-[#401b69] inline-flex items-center text-sm font-medium bg-purple-50 px-2 py-1 rounded transition-colors"><Edit className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">編輯</span></button>
                              <button onClick={() => handleDelete(course)} className="text-red-600 hover:text-red-900 inline-flex items-center text-sm font-medium bg-red-50 px-2 py-1 rounded transition-colors"><Trash2 className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">刪除</span></button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100">無權限</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 響應式：還原設計圖帶有帳篷 Logo 的深紫色頁尾 */}
      <footer className="bg-[#2B1143] py-6 sm:py-8 text-center text-purple-200 border-t border-[#1e0a30] mt-auto w-full">
        <div className="flex justify-center items-center gap-2 mb-2 sm:mb-3">
          <Tent className="h-5 w-5 sm:h-6 sm:w-6 text-purple-300" />
          <span className="font-bold tracking-wide text-sm sm:text-base">線上童軍營地公開課程交流資訊平台</span>
        </div>
        <p className="text-xs sm:text-sm text-purple-300/60 font-medium">
          © {new Date().getFullYear()} 線上童軍營地 Online Scouts Camp 版權所有
        </p>
      </footer>

      {/* 系統日誌 Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-blue-50/50 rounded-t-2xl">
              <h3 className="text-base sm:text-lg font-bold text-blue-900 flex items-center"><History className="mr-2 h-5 w-5" /> 系統操作詳細日誌</h3>
              <button onClick={() => setShowLogModal(false)} className="p-1 hover:bg-white rounded-full transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-auto p-0 sm:p-4">
              <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500 border-b">
                    <th className="py-3 px-4 text-left font-semibold">時間</th>
                    <th className="py-3 px-4 text-left font-semibold">使用者</th>
                    <th className="py-3 px-4 text-left font-semibold">執行動作</th>
                    <th className="py-3 px-4 text-left font-semibold">位置/IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {typeof log.timestamp?.toDate === 'function' ? log.timestamp.toDate().toLocaleString('zh-TW', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '記錄中...'}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800">{log.user || '未知'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${log.action?.includes('刪除') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {log.action || '未知動作'}
                          </span> 
                          <span className="text-gray-500 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-[300px]" title={typeof log.details === 'string' ? log.details : ''}>
                            {typeof log.details === 'string' ? log.details : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400 flex items-center whitespace-nowrap"><Globe className="h-3 w-3 mr-1 shrink-0" /> {log.location || '未知'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 帳號設定 Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAccountModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold flex items-center text-[#5A2E8A]"><Shield className="h-5 w-5 mr-2" /> 帳號管理</h3>
              <button onClick={() => setShowAccountModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              {admins
                .filter(admin => currentAdmin === 'admin666' ? true : admin.username === currentAdmin)
                .map(admin => (
                  <div key={admin.username} className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="font-bold flex items-center text-gray-800"><User className="h-4 w-4 mr-1.5 text-gray-400" /> {admin.username} {admin.isDefault && <span className="ml-2 text-[10px] bg-purple-100 text-[#5A2E8A] px-1.5 py-0.5 rounded border border-purple-200">預設</span>}</div>
                      <button onClick={() => { setEditingPasswordFor(admin.username); setConfirmOldPassword(''); setNewPasswordValue(''); }} className="text-xs font-bold text-[#5A2E8A] bg-purple-100 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition-colors w-full sm:w-auto text-center">修改密碼</button>
                    </div>
                    {editingPasswordFor === admin.username && (
                      <div className="mt-3 p-3 sm:p-4 bg-white rounded-lg border border-purple-100 space-y-3 shadow-inner">
                        <input type="password" placeholder="請輸入原密碼" value={confirmOldPassword} onChange={(e) => setConfirmOldPassword(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                        <input type="password" placeholder="設定新密碼" value={newPasswordValue} onChange={(e) => setNewPasswordValue(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => setEditingPasswordFor(null)} className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium hover:bg-gray-200">取消</button>
                          <button onClick={() => handleChangePassword(admin.username)} className="px-4 py-1.5 bg-[#5A2E8A] text-white text-xs rounded-lg font-bold hover:bg-[#401b69]">確認修改</button>
                        </div>
                      </div>
                    )}
                    {currentAdmin === 'admin666' && !admin.isDefault && (
                      <div className="flex justify-end pt-2 border-t border-gray-200 mt-2">
                         <button onClick={() => handleDeleteAdmin(admin.username)} className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center"><Trash2 className="h-3 w-3 mr-1"/>刪除帳號</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            {currentAdmin === 'admin666' && admins.length < 5 && (
              <form onSubmit={handleAddAdmin} className="mt-6 bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-[#5A2E8A] flex items-center"><UserPlus className="h-3 w-3 mr-1"/> 新增管理員</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" required placeholder="帳號" value={newAccountData.username} onChange={(e) => setNewAccountData({...newAccountData, username: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                  <input type="password" required placeholder="初始密碼" value={newAccountData.password} onChange={(e) => setNewAccountData({...newAccountData, password: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                  <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-[#5A2E8A] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#401b69]">新增</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 登入 Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 sm:p-8 shadow-2xl text-center">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-purple-100 mb-5"><Lock className="h-7 w-7 text-[#5A2E8A]" /></div>
            <h3 className="text-xl font-extrabold mb-6 text-gray-900">團長權限驗證</h3>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg">{loginError}</div>}
              <input type="text" required placeholder="請輸入帳號" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
              <input type="password" required placeholder="請輸入密碼" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
              <button type="submit" className="w-full py-3 bg-[#5A2E8A] text-white rounded-xl font-bold hover:bg-[#401b69] transition-colors shadow-md mt-2">登入系統</button>
            </form>
          </div>
        </div>
      )}

      {/* 課程編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 mt-12 sm:mt-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-[#5A2E8A]">{editingId ? '編輯營地課程' : '新增營地課程'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <form id="course-form" onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 font-bold mb-1.5">課程名稱 *</label>
                    <input type="text" required name="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5">分類 *</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#5A2E8A] outline-none">
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="custom_new">+ 新增自訂分類</option>
                    </select>
                  </div>
                  {formData.category === 'custom_new' && (
                     <div className="sm:col-span-2 bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <label className="block text-[#5A2E8A] font-bold mb-1.5">輸入新分類名稱 *</label>
                        <input type="text" required value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full px-4 py-2.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                     </div>
                  )}
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5">講師 *</label>
                    <input type="text" required value={formData.instructor} onChange={(e) => setFormData({...formData, instructor: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                  </div>
                  <div><label className="block text-gray-700 font-bold mb-1.5">開始時間 *</label><input type="datetime-local" required value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" /></div>
                  <div><label className="block text-gray-700 font-bold mb-1.5">結束時間 *</label><input type="datetime-local" required value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" /></div>
                  <div className="sm:col-span-2"><label className="block text-gray-700 font-bold mb-1.5">上課地點 *</label><input type="text" required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" /></div>
                  <div className="sm:col-span-2"><label className="block text-gray-700 font-bold mb-1.5">內容簡介 *</label><textarea required rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none leading-relaxed" /></div>
                  <div className="sm:col-span-2 border-t border-gray-100 pt-4 mt-2">
                     <label className="block text-gray-500 font-bold mb-1.5 text-xs uppercase">進階連結 (選填)</label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" value={formData.registrationLink} onChange={(e) => setFormData({...formData, registrationLink: e.target.value})} placeholder="報名表單網址 (https://...)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                        <input type="text" value={formData.eventLink} onChange={(e) => setFormData({...formData, eventLink: e.target.value})} placeholder="活動詳細網站 (https://...)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] outline-none" />
                     </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 rounded-b-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">取消</button>
              <button type="submit" form="course-form" className="w-full sm:w-auto px-8 py-2.5 bg-[#5A2E8A] text-white font-bold rounded-lg shadow-md hover:bg-[#401b69] transition-colors">儲存至雲端</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}