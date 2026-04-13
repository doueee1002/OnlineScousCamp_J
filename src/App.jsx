import React, { useState, useEffect, useRef } from 'react';
import { MapPin, CalendarPlus, User, Clock, Edit, Trash2, Plus, Calendar, ChevronRight, X, Search, Filter, Lock, LogOut, Settings, UserPlus, Shield, Loader2, Download, Upload, Link as LinkIcon, Users, Phone, MessageCircle, Tent, Compass, TreePine, Flame, Map as MapIcon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

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
const initialCourses = [
  {
    id: 'course-1',
    title: '初級童軍露營技能培訓',
    category: '訓練',
    instructor: '王團長',
    startTime: '2026-04-20T14:00',
    endTime: '2026-04-20T17:00',
    location: '陽明山童軍露營場',
    description: '從零開始學習搭帳篷、生火技巧與基礎繩結。適合剛加入童軍的新手夥伴。',
    registrationLink: 'https://google.com',
    eventLink: '',
    capacity: 30,
    contactLine: '@scout_tw',
    contactPhone: '0912-345-678'
  }
];

// --- 輔助函式 (移至外層供獨立組件使用) ---
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

const getGoogleMapsLink = (location) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || '')}`;
};

const formatDisplayTime = (start, end) => {
  if(!start || !end) return '時間未定';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const optionsDate = { month: 'short', day: 'numeric', weekday: 'short' };
  const optionsTime = { hour: '2-digit', minute: '2-digit' };
  return `${startDate.toLocaleDateString('zh-TW', optionsDate)} ${startDate.toLocaleTimeString('zh-TW', optionsTime)} - ${endDate.toLocaleTimeString('zh-TW', optionsTime)}`;
};

// --- 課程卡片獨立組件 (管理兩層式展開狀態) ---
const CourseCard = ({ course }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-md hover:border-[#5A2E8A]/30 transition-all flex flex-col group">
      {/* 第一層：基本資訊 (始終顯示) */}
      <div className="p-6 flex-grow relative">
        <div 
          className="flex justify-between items-start mb-2 cursor-pointer" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-xl font-bold text-[#5A2E8A] pr-2 transition-colors">{course.title}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-[#5A2E8A] shrink-0 border border-purple-200">
            {course.category}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#5A2E8A] text-sm font-bold hover:text-[#401b69] flex items-center transition-colors focus:outline-none bg-purple-50 px-3 py-1.5 rounded-lg w-full justify-center"
        >
          {isExpanded ? '收起詳細資訊' : '查看詳細資訊'}
          <ChevronRight className={`h-4 w-4 ml-1 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
        </button>
        
        {/* 第二層上半部：詳細時間地點與講師 */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
          <div className="space-y-2 text-sm text-gray-600 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-[#5A2E8A]/60" />
              <span className="font-medium text-gray-700">講師：{course.instructor}</span>
              {course.capacity && <span className="ml-auto text-xs bg-white border border-purple-100 text-[#5A2E8A] px-2 py-0.5 rounded flex items-center"><Users className="h-3 w-3 mr-1"/> 限額 {course.capacity} 人</span>}
            </div>
            <div className="flex items-start">
              <Clock className="h-4 w-4 mr-2 text-[#5A2E8A]/60 mt-0.5" />
              <span>{formatDisplayTime(course.startTime, course.endTime)}</span>
            </div>
            <div className="flex items-start">
              <MapPin className="h-4 w-4 mr-2 text-[#5A2E8A]/60 mt-0.5 shrink-0" />
              <a href={getGoogleMapsLink(course.location)} target="_blank" rel="noopener noreferrer" className="text-[#5A2E8A] hover:text-[#401b69] hover:underline inline-flex items-center font-medium" title="在 Google Maps 開啟">
                {course.location} <ChevronRight className="h-3 w-3 ml-0.5" />
              </a>
            </div>
            
            {(course.contactLine || course.contactPhone) && (
              <div className="mt-2 pt-2 border-t border-purple-100 flex flex-wrap gap-x-4 gap-y-1">
                {course.contactPhone && <div className="flex items-center text-gray-500 text-xs"><Phone className="h-3 w-3 mr-1 text-[#5A2E8A]/60"/> {course.contactPhone}</div>}
                {course.contactLine && <div className="flex items-center text-gray-500 text-xs"><MessageCircle className="h-3 w-3 mr-1 text-[#5A2E8A]/60"/> {course.contactLine}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 第二層下半部：操作連結 */}
      <div className={`bg-white transition-all duration-300 ease-in-out overflow-hidden border-t border-gray-100 ${isExpanded ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0 border-transparent'}`}>
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            {course.registrationLink && (
              <a href={course.registrationLink.startsWith('http') ? course.registrationLink : `https://${course.registrationLink}`} target="_blank" rel="noopener noreferrer" 
                 className="flex-1 flex items-center justify-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#5A2E8A] hover:bg-[#401b69] transition-colors">
                <LinkIcon className="h-4 w-4 mr-1" /> 報名連結
              </a>
            )}
            {course.eventLink && (
              <a href={course.eventLink.startsWith('http') ? course.eventLink : `https://${course.eventLink}`} target="_blank" rel="noopener noreferrer" 
                 className="flex-1 flex items-center justify-center px-3 py-2 border border-purple-200 rounded-lg shadow-sm text-sm font-medium text-[#5A2E8A] bg-purple-50 hover:bg-purple-100 transition-colors">
                <LinkIcon className="h-4 w-4 mr-1" /> 活動網站
              </a>
            )}
          </div>
          <a href={getGoogleCalendarLink(course)} target="_blank" rel="noopener noreferrer" 
             className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:text-[#5A2E8A] transition-colors">
            <CalendarPlus className="h-4 w-4 mr-2" /> 加入行事曆
          </a>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // 系統狀態
  const [authUser, setAuthUser] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef(null);

  // 雲端資料狀態
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  
  // 視圖與本地狀態
  const [view, setView] = useState('user'); // 'user' | 'admin'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  
  // 搜尋與篩選狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // 彈出視窗狀態
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ username: '', password: '' });
  const [editingPasswordFor, setEditingPasswordFor] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // 表單狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '', category: '訓練', instructor: '', startTime: '', endTime: '', location: '', description: '',
    registrationLink: '', eventLink: '', capacity: '', contactLine: '', contactPhone: ''
  });
  const [customCategory, setCustomCategory] = useState('');

  // --- 1. 處理 Firebase 驗證 (匿名連線) ---
  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("Auth failed:", error));
    const unsubscribe = onAuthStateChanged(auth, setAuthUser);
    return () => unsubscribe();
  }, []);

  // --- 2. 處理即時資料同步 (Firestore) ---
  useEffect(() => {
    if (!authUser) return;

    const coursesRef = collection(db, 'courses');
    const categoriesRef = collection(db, 'categories');
    const adminsRef = collection(db, 'admins');

    let isCoursesLoaded = false;
    let isCategoriesLoaded = false;
    let isAdminsLoaded = false;

    const checkAllLoaded = () => {
      if (isCoursesLoaded && isCategoriesLoaded && isAdminsLoaded) setIsDataLoading(false);
    };

    const unsubCourses = onSnapshot(coursesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length === 0 && !window.__seededCourses) {
        window.__seededCourses = true;
        initialCourses.forEach(c => setDoc(doc(coursesRef, c.id), c));
      } else {
        const sortedData = data.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setCourses(sortedData);
      }
      isCoursesLoaded = true; checkAllLoaded();
    }, console.error);

    const unsubCategories = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name || decodeURIComponent(doc.id)).filter(Boolean);
      const uniqueCategories = [...new Set(data)];
      
      if (uniqueCategories.length === 0 && !window.__seededCategories) {
        window.__seededCategories = true;
        initialCategories.forEach(cat => setDoc(doc(categoriesRef, encodeURIComponent(cat)), { name: cat }));
      } else {
        setCategories(uniqueCategories);
      }
      isCategoriesLoaded = true; checkAllLoaded();
    }, console.error);

    const unsubAdmins = onSnapshot(adminsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length === 0 && !window.__seededAdmins) {
        window.__seededAdmins = true;
        initialAdmins.forEach(a => setDoc(doc(adminsRef, a.username), a));
      } else {
        setAdmins(data);
      }
      isAdminsLoaded = true; checkAllLoaded();
    }, console.error);

    return () => { unsubCourses(); unsubCategories(); unsubAdmins(); };
  }, [authUser]);

  // --- 權限管理功能 ---
  const handleAdminClick = () => {
    if (isLoggedIn) setView('admin');
    else setShowLoginModal(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentAdmin(null); setView('user');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const user = admins.find(a => a.username === loginData.username && a.password === loginData.password);
    if (user) {
      setIsLoggedIn(true); setCurrentAdmin(user.username); setShowLoginModal(false); setView('admin'); setLoginError(''); setLoginData({ username: '', password: '' });
    } else {
      setLoginError('帳號或密碼錯誤，請重新輸入');
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
    if (!newPasswordValue.trim()) return alert('密碼不能為空'); 
    try { 
      await setDoc(doc(db, 'admins', username), { password: newPasswordValue }, { merge: true }); 
      setEditingPasswordFor(null); 
      setNewPasswordValue(''); 
      alert('密碼修改成功'); 
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

  // --- 課程管理與表單功能 ---
  const handleOpenModal = (course = null) => {
    setCustomCategory('');
    if (course) {
      setEditingId(course.id);
      setFormData({
        title: course.title || '', category: course.category || categories[0] || '其他', instructor: course.instructor || '', startTime: course.startTime || '', endTime: course.endTime || '', location: course.location || '', description: course.description || '',
        registrationLink: course.registrationLink || '', eventLink: course.eventLink || '', capacity: course.capacity || '', contactLine: course.contactLine || '', contactPhone: course.contactPhone || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        title: '', category: categories[0] || '其他', instructor: '', startTime: '', endTime: '', location: '', description: '',
        registrationLink: '', eventLink: '', capacity: '', contactLine: '', contactPhone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('確定要刪除這堂課程嗎？')) {
      try { await deleteDoc(doc(db, 'courses', String(id))); } 
      catch (err) { console.error(err); alert('刪除失敗'); }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    let finalCategory = formData.category;
    try {
      if (formData.category === 'custom_new') {
        finalCategory = customCategory.trim();
        if (finalCategory && !categories.includes(finalCategory)) {
          await setDoc(doc(db, 'categories', encodeURIComponent(finalCategory)), { name: finalCategory });
        }
      }
      const courseId = editingId || crypto.randomUUID();
      const courseToSave = { ...formData, category: finalCategory };
      await setDoc(doc(db, 'courses', String(courseId)), courseToSave);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err); alert('儲存課程失敗，請稍後再試。');
    }
  };

  // --- CSV 匯出匯入功能 ---
  const handleExportCSV = () => {
    const headers = ['id', 'title', 'category', 'instructor', 'startTime', 'endTime', 'location', 'description', 'registrationLink', 'eventLink', 'capacity', 'contactLine', 'contactPhone'];
    const csvRows = [];
    csvRows.push('\uFEFF' + headers.join(',')); // 加入 BOM

    courses.forEach(course => {
      const row = headers.map(header => {
        let val = course[header] === undefined || course[header] === null ? '' : String(course[header]);
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `線上童軍營地_課程匯出_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessingFile(true);

    const processText = async (text) => {
      try {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;
        
        const startIdx = text.charCodeAt(0) === 0xFEFF ? 1 : 0;

        for (let i = startIdx; i < text.length; i++) {
          const char = text[i];
          if (char === '"' && text[i+1] === '"') {
            currentCell += '"'; i++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell); currentCell = '';
          } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentCell); rows.push(currentRow); currentRow = []; currentCell = '';
          } else if (char !== '\r') {
            currentCell += char;
          }
        }
        if (currentCell || text[text.length-1] === ',') currentRow.push(currentCell);
        if (currentRow.length > 0) rows.push(currentRow);

        if (rows.length < 2) throw new Error("檔案沒有資料或格式錯誤");

        const headers = rows[0].map(h => h.trim());
        const expectedHeaders = ['id', 'title', 'category', 'instructor', 'startTime', 'endTime', 'location', 'description', 'registrationLink', 'eventLink', 'capacity', 'contactLine', 'contactPhone'];
        
        if (headers[0] !== 'id') throw new Error("檔案格式不符，第一欄必須是 'id'。建議先下載一份資料修改後再上傳。");

        const promises = [];
        const knownCategories = new Set(categories);
        
        for (let i = 1; i < rows.length; i++) {
          if (rows[i].length === 0 || (rows[i].length === 1 && rows[i][0] === '')) continue; 
          
          const courseData = {};
          headers.forEach((header, index) => {
            if(expectedHeaders.includes(header)) {
              courseData[header] = rows[i][index] || '';
            }
          });

          if (!courseData.title) continue;

          if (courseData.category && !knownCategories.has(courseData.category)) {
             const safeCatId = encodeURIComponent(courseData.category).replace(/\./g, '%2E').replace(/\//g, '%2F');
             promises.push(setDoc(doc(db, 'categories', safeCatId), { name: courseData.category }));
             knownCategories.add(courseData.category);
          }

          const courseId = courseData.id || crypto.randomUUID();
          if(!courseData.id) courseData.id = courseId; 

          const safeCourseId = encodeURIComponent(String(courseId)).replace(/\./g, '%2E').replace(/\//g, '%2F');
          promises.push(setDoc(doc(db, 'courses', safeCourseId), courseData));
        }

        await Promise.all(promises);
        alert(`成功匯入/更新了 ${promises.length} 筆課程資料！`);
      } catch (err) {
        console.error(err);
        alert('匯入失敗：' + err.message);
      } finally {
        setIsProcessingFile(false);
        if(fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      if (text.includes('')) {
        const readerBig5 = new FileReader();
        readerBig5.onload = (eBig5) => processText(eBig5.target.result);
        readerBig5.readAsText(file, 'big5');
      } else {
        processText(text);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const filteredCourses = courses.filter(course => {
    const matchSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory ? course.category === filterCategory : true;
    return matchSearch && matchCategory;
  });

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-[#5A2E8A]">
        <Loader2 className="h-10 w-10 animate-spin text-[#5A2E8A] mb-4" />
        <p className="text-lg font-medium">連線至專屬雲端營地中，請稍候...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Tent className="h-7 w-7 text-[#5A2E8A]" />
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">線上童軍營地公開課程交流資訊平台</span>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setView('user')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'user' ? 'bg-[#5A2E8A] text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-[#5A2E8A]'}`}>營地佈告欄</button>
              <button onClick={handleAdminClick} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-[#401b69] text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-[#5A2E8A]'}`}>團長後台</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {view === 'user' && (
          <div className="space-y-6">
            <div className="mb-8 relative bg-purple-50 p-6 sm:p-8 rounded-2xl border border-purple-100 overflow-hidden shadow-inner">
              <Compass className="absolute top-2 right-4 h-24 w-24 text-[#5A2E8A] opacity-10 rotate-12" />
              <TreePine className="absolute -bottom-6 right-24 h-32 w-32 text-[#5A2E8A] opacity-5" />
              <MapIcon className="absolute top-10 left-1/2 h-16 w-16 text-[#5A2E8A] opacity-5 -rotate-12" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#5A2E8A] flex items-center">
                    <Flame className="h-8 w-8 mr-2 text-orange-500" />
                    探索最新營地課程
                  </h1>
                  <p className="text-[#5A2E8A]/70 mt-2 font-medium">尋找感興趣的童軍與公開課程，加入行事曆絕不錯過學習機會。</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5A2E8A]/50" />
                    <input type="text" placeholder="搜尋課程或講師..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full sm:w-64 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A2E8A] bg-white/80 backdrop-blur-sm" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5A2E8A]/50" />
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="pl-10 pr-8 py-2 w-full sm:w-40 appearance-none border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A2E8A] bg-white/80 backdrop-blur-sm">
                      <option value="">所有分類</option>
                      {categories.map((cat, idx) => <option key={`filter-${idx}-${cat}`} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                <Tent className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">目前營區沒有符合條件的課程，請嘗試其他關鍵字或變更分類！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-200 pb-4 gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-[#5A2E8A] flex items-center">
                  團長後台管理中心
                  <span className="ml-3 text-sm font-normal bg-purple-100 text-[#5A2E8A] px-3 py-1 rounded-full flex items-center border border-purple-200">
                    <User className="h-4 w-4 mr-1" /> 目前登入: {currentAdmin}
                  </span>
                </h1>
                <p className="text-gray-500 mt-2">此處的資料會即時同步至雲端資料庫。</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                <button onClick={() => setShowAccountModal(true)} className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm text-sm font-medium w-full sm:w-auto whitespace-nowrap">
                  <Settings className="h-4 w-4 mr-1" /> 帳號設定
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-sm font-medium w-full sm:w-auto whitespace-nowrap">
                  <LogOut className="h-4 w-4 mr-1" /> 登出
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="搜尋管理課程..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 w-full sm:w-48 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A2E8A]" />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 text-sm w-full sm:w-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A2E8A] bg-white">
                  <option value="">所有分類</option>
                  {categories.map((cat, idx) => <option key={`admin-filter-${idx}-${cat}`} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
                
                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingFile} className="flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium w-full sm:w-auto">
                  {isProcessingFile ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1 text-blue-600" />} 上傳 CSV
                </button>
                <button onClick={handleExportCSV} className="flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-1 text-green-600" /> 下載 CSV
                </button>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center px-4 py-2 bg-[#5A2E8A] text-white rounded-lg hover:bg-[#401b69] transition-colors shadow-sm text-sm font-medium w-full sm:w-auto whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-1" /> 新增課程
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">課程名稱 / 分類 / 講師</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">附加資訊</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.length === 0 && (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">目前沒有資料，或沒有符合條件的課程。</td></tr>
                    )}
                    {filteredCourses.map(course => (
                      <tr key={course.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-gray-900">{course.title}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-[#5A2E8A]">{course.category}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <User className="h-3 w-3 mr-1" /> {course.instructor}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{course.startTime ? course.startTime.replace('T', ' ') : '-'}</div>
                          <div className="text-sm text-gray-500">{course.endTime ? `至 ${course.endTime.replace('T', ' ')}` : '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>人數: {course.capacity || '未限'}</div>
                            {course.registrationLink && <div className="text-green-600 font-medium">有報名連結</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button onClick={() => handleOpenModal(course)} className="text-[#5A2E8A] hover:text-[#401b69] inline-flex items-center">
                            <Edit className="h-4 w-4 mr-1" /> 編輯
                          </button>
                          <button onClick={() => handleDelete(course.id)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                            <Trash2 className="h-4 w-4 mr-1" /> 刪除
                          </button>
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

      {/* 頁尾 Footer 宣告 */}
      <footer className="bg-[#2B1143] py-8 text-center text-purple-200 border-t border-[#1e0a30] mt-auto">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Tent className="h-5 w-5 text-purple-300" />
          <span className="font-bold tracking-wide">線上童軍營地公開課程交流資訊平台</span>
        </div>
        <p className="text-sm text-purple-300/60">
          © {new Date().getFullYear()} 線上童軍營地 Online Scouts Camp 版權所有
        </p>
      </footer>

      {/* 表單 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:p-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="bg-white px-4 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-[#5A2E8A]">{editingId ? '編輯營地課程' : '新增營地課程'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="px-4 py-5 sm:p-6 overflow-y-auto flex-1">
              <form id="course-form" onSubmit={handleFormSubmit} className="space-y-5">
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
                  <h4 className="text-sm font-bold text-[#5A2E8A] uppercase">基本資訊 (必填)</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程名稱 *</label>
                    <input type="text" required name="title" value={formData.title} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] focus:outline-none bg-white" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">課程分類 *</label>
                      <select name="category" value={formData.category} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white">
                        {categories.map((cat, idx) => <option key={`form-cat-${idx}-${cat}`} value={cat}>{cat}</option>)}
                        <option value="custom_new">+ 新增自訂分類</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">講師姓名 *</label>
                      <input type="text" required name="instructor" value={formData.instructor} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" />
                    </div>
                  </div>
                  {formData.category === 'custom_new' && (
                    <div className="p-3 bg-[#5A2E8A]/10 rounded-lg border border-[#5A2E8A]/20">
                      <label className="block text-sm font-medium text-[#5A2E8A] mb-1">輸入新的分類名稱 *</label>
                      <input type="text" required={formData.category === 'custom_new'} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full px-3 py-2 border border-[#5A2E8A]/30 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" autoFocus />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">開始時間 *</label>
                      <input type="datetime-local" required name="startTime" value={formData.startTime} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">結束時間 *</label>
                      <input type="datetime-local" required name="endTime" value={formData.endTime} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">上課地點 *</label>
                    <input type="text" required name="location" value={formData.location} onChange={handleFormChange} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">課程介紹 *</label>
                    <textarea required name="description" value={formData.description} onChange={handleFormChange} rows={3} className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-[#5A2E8A] bg-white" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-500 uppercase">進階資訊 / 連結 (選填)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">報名連結 (網址)</label>
                      <input type="text" name="registrationLink" value={formData.registrationLink} onChange={handleFormChange} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">活動相關連結 (網址)</label>
                      <input type="text" name="eventLink" value={formData.eventLink} onChange={handleFormChange} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">開辦人數限制</label>
                      <input type="number" name="capacity" value={formData.capacity} onChange={handleFormChange} placeholder="如: 30" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">聯絡 Line ID</label>
                      <input type="text" name="contactLine" value={formData.contactLine} onChange={handleFormChange} placeholder="例如: @camp_line" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">聯絡手機號碼</label>
                      <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleFormChange} placeholder="例如: 0912-345-678" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">取消</button>
              <button type="submit" form="course-form" className="px-4 py-2 bg-[#5A2E8A] text-white rounded-lg hover:bg-[#401b69] font-medium shadow-sm">儲存至雲端</button>
            </div>
          </div>
        </div>
      )}

      {/* 登入 Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLoginModal(false)}></div>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="relative bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:max-w-sm w-full p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 mb-4"><Lock className="h-6 w-6 text-[#5A2E8A]" /></div>
                <h3 className="text-xl font-bold text-gray-900">團長後台登入</h3>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">{loginError}</div>}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">帳號</label><input type="text" required value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">密碼</label><input type="password" required value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" /></div>
                <button type="submit" className="w-full py-2.5 bg-[#5A2E8A] text-white rounded-lg hover:bg-[#401b69] font-medium mt-2 shadow-sm">登入</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 帳號設定 Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAccountModal(false)}></div>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="relative bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:max-w-lg w-full">
              <div className="bg-white p-6">
                <div className="flex justify-between items-center mb-5 border-b pb-3">
                  <h3 className="text-xl font-bold flex items-center text-[#5A2E8A]"><Shield className="h-5 w-5 mr-2" /> 帳號管理</h3>
                  <button onClick={() => setShowAccountModal(false)} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
                </div>
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">目前管理員列表 ({admins.length}/3)</h4>
                  <ul className="space-y-3">
                    {admins.map(admin => (
                      <li key={admin.username} className="p-3 border rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center"><User className="h-4 w-4 mr-2 text-gray-500" /><span className="font-medium text-gray-900">{admin.username}</span>{admin.isDefault && <span className="ml-2 px-2 py-0.5 text-[10px] bg-purple-100 text-[#5A2E8A] rounded font-medium border border-purple-200">預設帳號</span>}</div>
                        <div className="flex items-center gap-2">
                          {editingPasswordFor === admin.username ? (
                            <div className="flex gap-2"><input type="text" placeholder="新密碼" value={newPasswordValue} onChange={(e) => setNewPasswordValue(e.target.value)} className="px-2 py-1 text-sm border rounded w-24 focus:ring-2 focus:ring-[#5A2E8A]" /><button onClick={() => handleChangePassword(admin.username)} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">儲存</button><button onClick={() => setEditingPasswordFor(null)} className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400">取消</button></div>
                          ) : (
                            <><button onClick={() => { setEditingPasswordFor(admin.username); setNewPasswordValue(''); }} className="text-xs px-2 py-1 border border-purple-200 text-[#5A2E8A] bg-purple-50 rounded hover:bg-purple-100 font-medium">修改密碼</button>{!admin.isDefault && (<button onClick={() => handleDeleteAdmin(admin.username)} className="text-xs px-2 py-1 border border-red-200 text-red-700 bg-red-50 rounded flex items-center hover:bg-red-100 font-medium"><Trash2 className="h-3 w-3 mr-0.5" />刪除</button>)}</>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                {admins.length < 3 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500 uppercase mb-3 flex items-center"><UserPlus className="h-4 w-4 mr-1" /> 新增管理帳號</h4>
                    <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
                      <input type="text" required placeholder="自訂帳號" value={newAccountData.username} onChange={(e) => setNewAccountData({...newAccountData, username: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                      <input type="text" required placeholder="初始密碼" value={newAccountData.password} onChange={(e) => setNewAccountData({...newAccountData, password: e.target.value})} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#5A2E8A]" />
                      <button type="submit" className="px-4 py-2 bg-[#5A2E8A] text-white font-medium rounded-lg hover:bg-[#401b69] whitespace-nowrap shadow-sm">新增</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}