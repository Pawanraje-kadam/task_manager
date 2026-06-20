import React, { useState, useEffect, useRef } from 'react';

// --- UTILS & HELPERS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

const generateWeek = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      dateString: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate()
    });
  }
  return dates;
};

// Helper: Convert time string (e.g. "10:30 AM") to comparable minutes for sorting
const parseTime = (timeStr) => {
  const match = timeStr.trim().match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!match) return 0;
  let [_, h, m, modifier] = match;
  h = parseInt(h, 10);
  if (h === 12) h = modifier.toUpperCase() === 'AM' ? 0 : 12;
  else if (modifier.toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(m, 10);
};

const formatTimeForInput = (timeStr) => {
  const match = timeStr.trim().match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i);
  if (!match) return '';
  let [, h, m, modifier] = match;
  h = parseInt(h, 10);
  if (modifier.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

const formatTimeForDisplay = (timeInput) => {
  const match = timeInput.trim().match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return '';
  let [, h, m] = match;
  h = parseInt(h, 10);
  const modifier = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${modifier}`;
};

const getCurrentTimeInput = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Shared UI styling mapping
const taskThemes = {
  indigo: { bg: "bg-indigo-500", text: "text-indigo-100", inner: "bg-indigo-400/50" },
  rose: { bg: "bg-rose-500", text: "text-rose-100", inner: "bg-rose-400/50" },
  yellow: { bg: "bg-yellow-500", text: "text-yellow-100", inner: "bg-yellow-400/50" },
  blue: { bg: "bg-blue-500", text: "text-blue-100", inner: "bg-blue-400/50" },
  green: { bg: "bg-green-500", text: "text-green-100", inner: "bg-green-400/50" },
};

const priorityOptions = ['Low', 'Medium', 'High'];
const priorityStyles = {
  Low: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  Medium: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  High: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

const getPriorityStyle = (priority) => priorityStyles[priority] || priorityStyles.Medium;

const avatarOptions = [
  { seed: 'Luna', label: 'Luna' },
  { seed: 'Mia', label: 'Mia' },
  { seed: 'Ava', label: 'Ava' },
  { seed: 'Ethan', label: 'Ethan' },
  { seed: 'Leo', label: 'Leo' },
  { seed: 'Noah', label: 'Noah' },
];

const avatarColors = ['bg-blue-500', 'bg-indigo-500', 'bg-rose-500', 'bg-yellow-500', 'bg-green-500', 'bg-sky-500', 'bg-violet-500', 'bg-orange-500'];

const getAvatarColor = (seed) => {
  if (!seed) return 'bg-gray-300';
  const hash = Array.from(seed).reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return avatarColors[hash % avatarColors.length];
};

const getAvatarInitials = (text) => {
  if (!text) return '?';
  return text.trim().charAt(0).toUpperCase();
};

const AvatarCircle = ({ label, seed, className }) => (
  <div className={`flex items-center justify-center rounded-full ${getAvatarColor(seed)} ${className || ''}`}>
    <span className="text-sm font-semibold text-white">{getAvatarInitials(label || seed)}</span>
  </div>
);

const isValidDateString = (value) => typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);
const isValidTimeString = (value) => typeof value === 'string' && (
  /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(value) ||
  /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i.test(value)
);

const normalizeTask = (task) => ({
  id: Number(task?.id) || Date.now(),
  title: String(task?.title || '').trim(),
  desc: String(task?.desc || '').trim(),
  time: String(task?.time || '').trim(),
  date: String(task?.date || getTodayDateString()),
  progress: typeof task?.progress === 'number' ? Math.min(100, Math.max(0, task.progress)) : 0,
  status: ['To-Do', 'Progress', 'Done'].includes(task?.status) ? task.status : 'To-Do',
  priority: ['Low', 'Medium', 'High'].includes(task?.priority) ? task.priority : 'Medium',
  theme: Object.keys(taskThemes).includes(task?.theme) ? task.theme : 'blue',
});

const isValidTask = (task) => {
  if (!task || typeof task !== 'object') return false;
  if (!task.title || typeof task.title !== 'string' || task.title.trim() === '') return false;
  if (!isValidTimeString(task.time)) return false;
  if (!isValidDateString(task.date)) return false;
  if (typeof task.progress !== 'number' || task.progress < 0 || task.progress > 100) return false;
  if (!['To-Do', 'Progress', 'Done'].includes(task.status)) return false;
  return true;
};

const isValidProfile = (profile) => {
  return profile && typeof profile === 'object' && typeof profile.name === 'string' && profile.name.trim() !== '' && typeof profile.seed === 'string' && profile.seed.trim() !== '';
};

// --- DEFAULT STATE ---
const todayStr = getTodayDateString();
const defaultTasks = [
  { id: 1, title: "Team Meeting 👥", desc: "Group discussion for the new product.", time: "10:00 AM", date: todayStr, progress: 48, status: "Progress", priority: "High", theme: "indigo" },
  { id: 2, title: "UI Design 🎨", desc: "Make a homepage for the olakart app.", time: "11:00 AM", date: todayStr, progress: 20, status: "To-Do", priority: "Medium", theme: "rose" },
  { id: 3, title: "Wireframing", desc: "Make some ideation from sketch and wireframes.", time: "12:00 PM", date: todayStr, progress: 100, status: "Done", priority: "Low", theme: "rose" },
];

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('taskManagerTheme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return false;
    } catch (e) {
      console.error('Failed to read theme from localStorage', e);
      return false;
    }
  });
  const [quickAddValue, setQuickAddValue] = useState('');

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDarkMode);
      localStorage.setItem('taskManagerTheme', isDarkMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to update theme', e);
    }
  }, [isDarkMode]);

  // State & Persistence with strict Try/Catch error handling
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('taskManagerData');
      if (!saved) return defaultTasks;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter(isValidTask).map(normalizeTask);
      return defaultTasks;
    } catch (e) {
      console.error("Failed to parse tasks from localStorage", e);
      return defaultTasks;
    }
  });
  
  const [profile, setProfile] = useState(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('taskManagerData', JSON.stringify(tasks)); } 
    catch (e) { console.error("Storage limit exceeded", e); }
  }, [tasks]);

  // Load profile on mount; if missing or invalid, prompt user to set name.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('taskManagerProfile');
      if (!saved) {
        setProfile(null);
        setShowProfilePrompt(true);
        return;
      }
      const parsed = JSON.parse(saved);
      if (isValidProfile(parsed)) {
        setProfile(parsed);
        setShowProfilePrompt(false);
      } else {
        setProfile(null);
        setShowProfilePrompt(true);
      }
    } catch (e) {
      console.error("Failed to parse profile from localStorage", e);
      setProfile(null);
      setShowProfilePrompt(true);
    }
  }, []);

  // Persist profile only when it's valid
  useEffect(() => {
    try {
      if (isValidProfile(profile)) localStorage.setItem('taskManagerProfile', JSON.stringify(profile));
    } catch (e) { console.error("Failed to update profile in localStorage", e); }
  }, [profile]);

  // Shared Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); 
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Task Handlers
  const handleSaveTask = (taskData) => {
    if (taskData.id) {
      setTasks(prev => prev.map(t => t.id === taskData.id ? normalizeTask({ ...t, ...taskData }) : t));
      return;
    }

    const themes = Object.keys(taskThemes);
    const newTask = normalizeTask({
      id: Date.now(),
      ...taskData,
      theme: themes[Math.floor(Math.random() * themes.length)]
    });
    setTasks(prev => [...prev, newTask]);
  };

  const handleQuickAddTask = (e) => {
    e.preventDefault();
    const title = quickAddValue.trim();
    if (!title) return;

    handleSaveTask({
      title,
      desc: '',
      time: formatTimeForDisplay(getCurrentTimeInput()),
      date: getTodayDateString(),
      progress: 0,
      status: 'To-Do',
      priority: 'Medium'
    });
    setQuickAddValue('');
  };

  const handleDeleteTask = (taskId) => setTasks(tasks.filter(t => t.id !== taskId));
  const handleImportTasks = (importedTasks) => {
    if (!Array.isArray(importedTasks)) {
      return { success: false, message: 'Import failed: file must contain an array of tasks.' };
    }

    const validTasks = importedTasks.map(normalizeTask).filter(isValidTask);
    if (validTasks.length === 0) {
      return { success: false, message: 'Import failed: no valid tasks were found in the uploaded file.' };
    }

    setTasks(validTasks);
    return { success: true, message: `Imported ${validTasks.length} task${validTasks.length !== 1 ? 's' : ''} successfully.` };
  };
  const handleReorderTasks = (reorderedTasks) => setTasks(reorderedTasks);

  // Track navigation direction for screen transition animation
  const [navDirection, setNavDirection] = useState('right');
  const [screenKey, setScreenKey] = useState(0);

  const goToSchedule = () => { setNavDirection('right'); setScreenKey(k => k+1); setCurrentView('schedule'); };
  const goToHome     = () => { setNavDirection('left');  setScreenKey(k => k+1); setCurrentView('home'); };

  return (
    <div className={`min-h-screen flex items-center justify-center sm:p-6 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300'}`}>
      <div className={`w-full h-screen sm:w-[375px] sm:h-[812px] sm:rounded-[40px] shadow-2xl overflow-hidden relative sm:border-[8px] flex flex-col transition-colors duration-500 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        {currentView === 'home' ? (
          <HomeScreen
            key={screenKey}
            enterClass="screen-enter-left"
            onNavigate={goToSchedule}
            tasks={tasks}
            profile={profile || { name: '', seed: 'Rifat' }}
            setProfile={setProfile}
            showProfilePrompt={showProfilePrompt}
            setShowProfilePrompt={setShowProfilePrompt}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onImportTasks={handleImportTasks}
            quickAddValue={quickAddValue}
            setQuickAddValue={setQuickAddValue}
            onQuickAddTask={handleQuickAddTask}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          />
        ) : (
          <ScheduleScreen
            key={screenKey}
            enterClass="screen-enter-right"
            onNavigate={goToHome}
            tasks={tasks}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onReorder={handleReorderTasks}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}

// --- HOME SCREEN ---
function HomeScreen({ onNavigate, tasks, profile, setProfile, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onSaveTask, onDeleteTask, onImportTasks, quickAddValue, setQuickAddValue, onQuickAddTask, isDarkMode, onToggleDarkMode, showProfilePrompt, setShowProfilePrompt, enterClass }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const openSettings = () => setIsSettingsOpen(true);
  const openProfileEditor = () => setIsProfileEditorOpen(true);

  // Filter and chronologically sort the tasks for the dashboard
  const displayTasks = tasks
    .filter(task => {
      const isToday = task.date === getTodayDateString();
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || task.status === activeFilter;
      return isToday && matchesSearch && matchesFilter;
    })
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  return (
    <div className={`p-6 h-full flex flex-col bg-white dark:bg-gray-900 overflow-y-auto no-scrollbar transition-colors duration-500 ${enterClass || ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4 stagger-section">
        <button onClick={openSettings} aria-label="Open settings" className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-smooth-fast hover-scale active:scale-95 dark:bg-gray-800 dark:hover:bg-gray-700">
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onToggleDarkMode} aria-label="Toggle dark mode" className="p-2 rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-smooth hover-scale active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {isDarkMode ? (
              <span className="text-lg leading-none" aria-hidden="true">🌞</span>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            )}
          </button>
          <button onClick={() => setIsCreatingTask(true)} aria-label="Add task" className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-smooth-fast shadow-sm hover-glow active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" /></svg>
          </button>
          <button onClick={openProfileEditor} aria-label="Edit profile" className="w-10 h-10 rounded-full overflow-hidden shadow-sm hover:ring-2 ring-blue-300 transition-smooth hover-scale active:scale-95">
            <AvatarCircle label={profile.name} seed={profile.seed} className="w-full h-full rounded-full" />
          </button>
        </div>
      </div>

      <form onSubmit={onQuickAddTask} className="mb-6 rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 p-4 shadow-sm dark:border-gray-700 dark:from-gray-800/80 dark:via-gray-800/70 dark:to-gray-800/80 stagger-section">
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">Quick Add</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            placeholder="Add a task and press Enter"
            className="flex-1 rounded-2xl border border-transparent bg-white/80 px-3 py-2.5 text-sm text-gray-700 outline-none transition-smooth placeholder:text-gray-400 focus:border-blue-300 focus:bg-white dark:bg-gray-900/80 dark:text-gray-100"
          />
          <button type="submit" className="rounded-2xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-smooth hover:bg-blue-700 active:scale-95">Add</button>
        </div>
      </form>

      <div className="mb-6 stagger-section">
        <p className="text-gray-500 text-sm mb-1 dark:text-gray-400">Good Morning, {profile.name}!</p>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight dark:text-white">
          You have <span className="text-blue-500">{tasks.filter(t => t.date === getTodayDateString()).length} tasks</span> <br/> today 👍
        </h1>
        {(searchQuery || activeFilter !== 'All') && (
          <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">Showing {displayTasks.length} of {tasks.filter(t => t.date === getTodayDateString()).length} tasks for today.</p>
        )}
      </div>

      <div className="relative mb-8 stagger-section">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search today's tasks..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 placeholder-gray-400 font-medium transition-smooth focus:bg-blue-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
      </div>

      <div className="flex justify-between mb-8 gap-3 stagger-section">
        {['All', 'To-Do', 'Progress', 'Done'].map((status, i) => {
          const isActive = activeFilter === status;
          const bgClass = status === 'All' ? 'bg-blue-100 text-blue-600' : i===1 ? 'bg-pink-100 text-pink-500' : i===2 ? 'bg-yellow-100 text-yellow-500' : 'bg-green-100 text-green-500';
          return (
            <div key={status} onClick={() => setActiveFilter(status)} className={`flex-1 flex flex-col items-center justify-center p-4 rounded-3xl hover:shadow-lg transition-smooth-fast cursor-pointer stagger-item ${isActive ? 'bg-gray-100 ring-2 ring-gray-200 scale-105 dark:bg-gray-700 dark:ring-gray-600' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${bgClass}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{status}</span>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-end mb-4 stagger-section">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Tasks</h2>
        <button onClick={onNavigate} className="text-xs text-blue-600 font-bold hover:text-blue-800 transition dark:text-blue-400">Schedule ➔</button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {displayTasks.length === 0 ? (
          <div className="w-full p-8 text-center bg-gray-50 rounded-[30px] border-2 border-dashed border-gray-200 animate-fadeIn dark:bg-gray-800 dark:border-gray-700"><p className="text-gray-400 font-medium text-sm">No tasks match.</p></div>
        ) : (
          displayTasks.map((task, idx) => <div key={task.id} className="stagger-item"><TaskCard task={task} onClick={() => setEditingTask(task)} /></div>)
        )}
      </div>

      <TaskModal isOpen={!!editingTask || isCreatingTask} task={editingTask} onClose={() => { setEditingTask(null); setIsCreatingTask(false); }} onSubmit={(data) => { onSaveTask(data); setEditingTask(null); setIsCreatingTask(false); }} onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} tasks={tasks} onImportTasks={onImportTasks} onOpenProfileEditor={openProfileEditor} />
      <ProfileModal
        isOpen={isProfileEditorOpen || showProfilePrompt}
        force={showProfilePrompt}
        onClose={() => setIsProfileEditorOpen(false)}
        profile={profile || { name: '', seed: 'Rifat' }}
        setProfile={(p) => { setProfile(p); setIsProfileEditorOpen(false); setShowProfilePrompt(false); }}
      />
    </div>
  );
}

// --- SCHEDULE SCREEN ---
function ScheduleScreen({ onNavigate, tasks, selectedDate, setSelectedDate, onSaveTask, onDeleteTask, onReorder, isDarkMode, enterClass }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const weekDates = generateWeek();
  // Purposefully NOT chronologically sorted here to preserve user's manual Drag & Drop ordering
  const displayTasks = tasks.filter(task => task.date === selectedDate);

  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleDragStart = (e, index) => { dragItem.current = index; };
  const handleDragEnter = (e, index) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current == null) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    if (dragOverItem.current == null || dragOverItem.current === dragItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const reordered = [...displayTasks];
    const draggedContent = reordered.splice(dragItem.current, 1)[0];
    if (!draggedContent) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    reordered.splice(dragOverItem.current, 0, draggedContent);
    dragItem.current = null; dragOverItem.current = null;
    
    // Correctly reconstruct the global array to ensure DND persists without data loss
    const otherTasks = tasks.filter(t => t.date !== selectedDate);
    onReorder([...otherTasks, ...reordered]);
  };

  return (
    <div className={`p-6 h-full flex flex-col relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} ${enterClass || ''}`}>
      <div className="flex justify-between items-center mb-2 pt-4 stagger-section">
        <button onClick={onNavigate} className={`p-2 rounded-full shadow-sm hover:shadow-md transition ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
          <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <button onClick={() => setIsAddingTask(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center gap-2">
          <span>+</span> Add Task
        </button>
      </div>
      <p className={`text-xs mb-4 stagger-section ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Drag tasks up or down to reorder them.</p>

      <div className={`flex justify-between items-center mb-8 p-4 rounded-3xl shadow-sm overflow-x-auto no-scrollbar gap-2 transition-colors duration-500 stagger-section ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {weekDates.map((day) => {
          const isActive = day.dateString === selectedDate;
          return (
            <div key={day.dateString} onClick={() => setSelectedDate(day.dateString)} className="flex flex-col items-center cursor-pointer min-w-[32px]">
              <span className={`text-[10px] font-medium mb-2 ${isActive ? 'text-blue-600' : isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>{day.dayName}</span>
              <span className={`text-sm font-bold ${isActive ? 'text-blue-600' : isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{day.dayNumber}</span>
              {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-2"></div>}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-10">
        <div className={`absolute left-2 top-2 bottom-0 w-px z-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className="space-y-6 relative z-10 pl-8">
           {displayTasks.length === 0 ? (
            <p className={`text-sm mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No tasks scheduled.</p>
          ) : (
            displayTasks.map((task, index) => (
              <TimelineItem 
                key={task.id} 
                task={task} 
                onClick={() => setEditingTask(task)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>
      </div>

      <TaskModal isOpen={isAddingTask || !!editingTask} task={editingTask} selectedDate={selectedDate} onClose={() => { setIsAddingTask(false); setEditingTask(null); }} onSubmit={(data) => { onSaveTask(data); setIsAddingTask(false); setEditingTask(null); }} onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
    </div>
  );
}

// --- SUB-COMPONENTS ---
function TaskCard({ task, onClick }) {
  const t = taskThemes[task.theme] || taskThemes.blue;
  const priority = getPriorityStyle(task.priority || 'Medium');

  return (
    <div onClick={onClick} className={`min-w-[200px] ${t.bg} rounded-[30px] p-5 text-white shadow-lg cursor-pointer hover-lift active:scale-95`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-bold text-base truncate">{task.title}</h3>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priority.badge}`}>{task.priority || 'Medium'}</span>
      </div>
      <p className={`${t.text} text-xs mb-4 leading-relaxed line-clamp-2`}>{task.desc}</p>
      <div className={`flex items-center gap-2 mb-4`}>
        <div className={`text-xs font-medium ${t.inner} inline-block px-2 py-1 rounded-lg`}>{task.time}</div>
        <div className={`text-[10px] font-bold ${t.inner} inline-block px-2 py-1 rounded-lg uppercase`}>{task.status}</div>
      </div>
      <div className="flex justify-between items-center text-xs font-bold mb-1"><span>Progress</span><span>{task.progress}%</span></div>
      <div className={`w-full ${t.inner} rounded-full h-1.5 overflow-hidden`}><div className="bg-white h-1.5 rounded-full transition-smooth" style={{ width: `${task.progress}%` }}></div></div>
    </div>
  );
}

function TimelineItem({ task, onClick, draggable, onDragStart, onDragEnter, onDragEnd }) {
  const isDone = task.status === 'Done';
  return (
    <div 
      className="relative cursor-grab group" 
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className={`absolute top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-colors ${isDone ? 'bg-gray-300' : 'bg-rose-500 ring-2 ring-rose-200'}`} style={{ left: '-1.5rem', transform: 'translateX(-50%)' }}></div>
      <div className={`p-5 rounded-3xl shadow-sm hover-lift ${isDone ? 'bg-gray-100 text-gray-800' : 'bg-rose-500 text-white'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-80">⋮⋮</span>
            <h3 className="font-bold text-sm truncate pr-2">{task.title}</h3>
          </div>
          <span className={`text-xs font-semibold whitespace-nowrap ${isDone ? 'text-gray-500' : 'text-white/90'}`}>{task.time}</span>
        </div>
        <p className={`text-xs leading-relaxed line-clamp-2 ${isDone ? 'text-gray-500' : 'text-white/80'}`}>{task.desc}</p>
      </div>
    </div>
  );
}

function TaskModal({ isOpen, task, selectedDate, onClose, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({ title: '', time: '', date: getTodayDateString(), desc: '', progress: 0, status: 'To-Do' });
  const [timeInput, setTimeInput] = useState(getCurrentTimeInput());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      setTimeInput(formatTimeForInput(task.time) || getCurrentTimeInput());
    } else {
      setFormData({ title: '', time: '', date: selectedDate || getTodayDateString(), desc: '', progress: 0, status: 'To-Do' });
      setTimeInput(getCurrentTimeInput());
    }
    setShowConfirmDelete(false);
    setFormError('');
  }, [task, isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const displayTime = formatTimeForDisplay(timeInput);
    if (!displayTime) {
      setFormError("Please select a valid time.");
      return;
    }
    if (typeof formData.title !== 'string' || formData.title.trim() === '') {
      setFormError("Title is required.");
      return;
    }
    setFormError('');
    onSubmit({ ...formData, time: displayTime });
  };

  if (showConfirmDelete) {
    return (
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full rounded-[30px] p-6 shadow-2xl text-center">
          <h3 className="font-bold text-lg text-gray-900 mb-2">Delete Task?</h3>
          <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
             <button type="button" onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition">Cancel</button>
             <button type="button" onClick={() => onDelete(task.id)} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-200">Delete</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-h-[90%] overflow-y-auto rounded-[30px] p-6 shadow-2xl transition-all no-scrollbar flex flex-col animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{task ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-smooth-fast hover-scale active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div><label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Title</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" /></div>
          
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Date</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" /></div>
            <div className="flex-1"><label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Time</label><input type="time" required value={timeInput} onChange={e => setTimeInput(e.target.value)} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" /></div>
          </div>

          <div><label className="block text-xs font-bold text-gray-600 mb-1 ml-1 dark:text-gray-300">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:text-gray-100"><option value="To-Do">To-Do</option><option value="Progress">Progress</option><option value="Done">Done</option></select></div>
          <div><label className="block text-xs font-bold text-gray-600 mb-1 ml-1 dark:text-gray-300">Priority</label><select value={formData.priority || 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:text-gray-100"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select></div>
          <div><label className="block text-xs font-bold text-gray-600 mb-1 ml-1 dark:text-gray-300">Progress: {formData.progress}%</label><input type="range" min="0" max="100" value={formData.progress} onChange={e => setFormData({...formData, progress: Number(e.target.value)})} className="w-full accent-blue-600 transition-smooth" /></div>
          <div><label className="block text-xs font-bold text-gray-600 mb-1 ml-1 dark:text-gray-300">Description</label><textarea rows="2" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium resize-none transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:text-gray-100"></textarea></div>
          {formError && <p className="text-sm text-red-600 mt-1">{formError}</p>}
          <div className="flex gap-3 mt-6">
            {task && <button type="button" onClick={() => setShowConfirmDelete(true)} className="bg-red-50 text-red-600 font-bold py-4 px-6 rounded-2xl hover:bg-red-100 transition-smooth hover-scale active:scale-95">Delete</button>}
            <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95 shadow-lg shadow-blue-200">{task ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, tasks, onImportTasks, onOpenProfileEditor }) {
  const [importMessage, setImportMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setImportMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(tasks, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "tasks_backup.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setImportMessage({ type: 'success', text: 'Tasks exported successfully.' });
    } catch (e) {
      console.error("Export failed", e);
      setImportMessage({ type: 'error', text: 'Failed to export tasks.' });
    }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImportMessage({ type: 'error', text: 'No file selected for import.' });
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        const result = onImportTasks(parsed);
        if (result?.success) {
          setImportMessage({ type: 'success', text: result.message });
        } else {
          setImportMessage({ type: 'error', text: result?.message || 'Import failed: the selected file did not contain valid tasks.' });
        }
      } catch (error) {
        console.error("Import error:", error);
        setImportMessage({ type: 'error', text: 'Invalid file format. Please upload a valid JSON backup.' });
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full rounded-[30px] p-6 shadow-2xl transition-all animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Settings</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-smooth-fast hover-scale active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Use the avatar icon to customize your profile name and avatar. Settings includes task import/export and general app controls.</p>
          <button onClick={handleExport} className="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl hover:bg-gray-800 transition-smooth hover-scale active:scale-95">Export Tasks (JSON)</button>
          <label className="w-full flex items-center justify-center bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-smooth hover-scale active:scale-95 cursor-pointer">
            Import Tasks (JSON)
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importMessage && (
            <p className={`text-sm ${importMessage.type === 'error' ? 'text-red-600' : 'text-green-600'} mt-2 animate-slideUp`} role="alert">{importMessage.text}</p>
          )}
          <button onClick={() => { onClose(); onOpenProfileEditor(); }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95">Edit profile</button>
          <button type="button" onClick={onClose} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-smooth hover-scale active:scale-95">Close</button>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ isOpen, onClose, profile, setProfile, force = false }) {
  const [draftProfile, setDraftProfile] = useState(profile || { name: '', seed: '' });

  useEffect(() => {
    if (isOpen) {
      setDraftProfile(profile || { name: '', seed: '' });
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!draftProfile.name.trim()) return;
    const finalProfile = { ...draftProfile, seed: draftProfile.name.trim() };
    try {
      localStorage.setItem('taskManagerProfile', JSON.stringify(finalProfile));
    } catch (e) {
      console.error('Failed to persist profile directly', e);
    }
    setProfile(finalProfile);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full rounded-[30px] p-6 shadow-2xl transition-all animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Profile</h3>
          {!force && (
            <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 transition-smooth-fast hover-scale active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Your Name</label>
            <input
              type="text"
              value={draftProfile.name}
              onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
              className="w-full bg-gray-50 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Avatar</label>
              <div className="w-20 h-20">
                <AvatarCircle label={draftProfile.name} seed={draftProfile.name} className="w-full h-full rounded-2xl" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Avatar is generated from the first letter of your name.</p>
          </div>

          <div className="flex gap-3 mt-3">
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95">Save</button>
            {!force && (
              <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-smooth hover-scale active:scale-95">Cancel</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
