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
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const taskThemes = {
  indigo: { bg: "bg-indigo-500", text: "text-indigo-100", inner: "bg-indigo-400/50" },
  rose:   { bg: "bg-rose-500",   text: "text-rose-100",   inner: "bg-rose-400/50"   },
  yellow: { bg: "bg-yellow-500", text: "text-yellow-100", inner: "bg-yellow-400/50" },
  blue:   { bg: "bg-blue-500",   text: "text-blue-100",   inner: "bg-blue-400/50"   },
  green:  { bg: "bg-green-500",  text: "text-green-100",  inner: "bg-green-400/50"  },
};

const priorityStyles = {
  Low:    { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  Medium: { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500'   },
  High:   { badge: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-500'    },
};
const getPriorityStyle = (priority) => priorityStyles[priority] || priorityStyles.Medium;

const avatarColors = ['bg-blue-500','bg-indigo-500','bg-rose-500','bg-yellow-500','bg-green-500','bg-sky-500','bg-violet-500','bg-orange-500'];
const getAvatarColor = (seed) => {
  if (!seed) return 'bg-gray-300';
  const hash = Array.from(seed).reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return avatarColors[hash % avatarColors.length];
};
const getAvatarInitials = (text) => (!text ? '?' : text.trim().charAt(0).toUpperCase());

const AvatarCircle = ({ label, seed, className }) => (
  <div className={`flex items-center justify-center rounded-full ${getAvatarColor(seed)} ${className || ''}`}>
    <span className="text-sm font-semibold text-white">{getAvatarInitials(label || seed)}</span>
  </div>
);

const isValidDateString = (v) => typeof v === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v);
const isValidTimeString = (v) => typeof v === 'string' && (
  /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(v) ||
  /^(1[0-2]|0?[1-9]):([0-5][0-9])\s?(AM|PM)$/i.test(v)
);

const normalizeTask = (task) => ({
  id:       Number(task?.id) || Date.now(),
  title:    String(task?.title || '').trim(),
  desc:     String(task?.desc  || '').trim(),
  time:     String(task?.time  || '').trim(),
  date:     String(task?.date  || getTodayDateString()),
  progress: typeof task?.progress === 'number' ? Math.min(100, Math.max(0, task.progress)) : 0,
  status:   ['To-Do','Progress','Done'].includes(task?.status) ? task.status : 'To-Do',
  priority: ['Low','Medium','High'].includes(task?.priority)   ? task.priority : 'Medium',
  theme:    Object.keys(taskThemes).includes(task?.theme)       ? task.theme    : 'blue',
});

const isValidTask = (task) => {
  if (!task || typeof task !== 'object') return false;
  if (!task.title || typeof task.title !== 'string' || task.title.trim() === '') return false;
  if (!isValidTimeString(task.time))  return false;
  if (!isValidDateString(task.date))  return false;
  if (typeof task.progress !== 'number' || task.progress < 0 || task.progress > 100) return false;
  if (!['To-Do','Progress','Done'].includes(task.status)) return false;
  return true;
};

const isValidProfile = (p) =>
  p && typeof p === 'object' &&
  typeof p.name === 'string' && p.name.trim() !== '' &&
  typeof p.seed === 'string' && p.seed.trim() !== '';

// --- DEFAULT STATE ---
const todayStr = getTodayDateString();
const defaultTasks = [
  { id: 1, title: "Team Meeting 👥", desc: "Group discussion for the new product.", time: "10:00 AM", date: todayStr, progress: 48, status: "Progress", priority: "High",   theme: "indigo" },
  { id: 2, title: "UI Design 🎨",    desc: "Make a homepage for the olakart app.", time: "11:00 AM", date: todayStr, progress: 20, status: "To-Do",   priority: "Medium", theme: "rose"   },
  { id: 3, title: "Wireframing",     desc: "Ideation from sketches and wireframes.", time: "12:00 PM", date: todayStr, progress: 100,status: "Done",    priority: "Low",    theme: "rose"   },
];

// --- RESPONSIVE HOOK ---
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

// --- MAIN APP ---
export default function App() {
  const isDesktop = useIsDesktop();

  const [currentView, setCurrentView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('taskManagerTheme');
      return saved === 'dark';
    } catch { return false; }
  });
  const [quickAddValue, setQuickAddValue] = useState('');

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', isDarkMode);
      localStorage.setItem('taskManagerTheme', isDarkMode ? 'dark' : 'light');
    } catch (e) { console.error('Failed to update theme', e); }
  }, [isDarkMode]);

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('taskManagerData');
      if (!saved) return defaultTasks;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter(isValidTask).map(normalizeTask);
      return defaultTasks;
    } catch { return defaultTasks; }
  });

  const [profile, setProfile] = useState(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [screenKey, setScreenKey] = useState(0);

  useEffect(() => {
    try { localStorage.setItem('taskManagerData', JSON.stringify(tasks)); }
    catch (e) { console.error('Storage limit exceeded', e); }
  }, [tasks]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('taskManagerProfile');
      if (!saved) { setProfile(null); setShowProfilePrompt(true); return; }
      const parsed = JSON.parse(saved);
      if (isValidProfile(parsed)) { setProfile(parsed); setShowProfilePrompt(false); }
      else { setProfile(null); setShowProfilePrompt(true); }
    } catch { setProfile(null); setShowProfilePrompt(true); }
  }, []);

  useEffect(() => {
    try {
      if (isValidProfile(profile)) localStorage.setItem('taskManagerProfile', JSON.stringify(profile));
    } catch (e) { console.error('Failed to save profile', e); }
  }, [profile]);

  const handleSaveTask = (taskData) => {
    if (taskData.id) {
      setTasks(prev => prev.map(t => t.id === taskData.id ? normalizeTask({ ...t, ...taskData }) : t));
      return;
    }
    const themes = Object.keys(taskThemes);
    setTasks(prev => [...prev, normalizeTask({
      id: Date.now(), ...taskData,
      theme: themes[Math.floor(Math.random() * themes.length)]
    })]);
  };

  const handleQuickAddTask = (e) => {
    e.preventDefault();
    const title = quickAddValue.trim();
    if (!title) return;
    handleSaveTask({ title, desc: '', time: formatTimeForDisplay(getCurrentTimeInput()), date: getTodayDateString(), progress: 0, status: 'To-Do', priority: 'Medium' });
    setQuickAddValue('');
  };

  const handleDeleteTask    = (id) => setTasks(tasks.filter(t => t.id !== id));
  const handleReorderTasks  = (reordered) => setTasks(reordered);
  const handleImportTasks   = (importedTasks) => {
    if (!Array.isArray(importedTasks)) return { success: false, message: 'Import failed: file must contain an array of tasks.' };
    const valid = importedTasks.map(normalizeTask).filter(isValidTask);
    if (valid.length === 0) return { success: false, message: 'Import failed: no valid tasks were found.' };
    setTasks(valid);
    return { success: true, message: `Imported ${valid.length} task${valid.length !== 1 ? 's' : ''} successfully.` };
  };

  const goToSchedule = () => { setScreenKey(k => k + 1); setCurrentView('schedule'); };
  const goToHome     = () => { setScreenKey(k => k + 1); setCurrentView('home'); };

  const safeProfile = profile || { name: '', seed: 'User' };

  // Shared props
  const sharedProps = {
    tasks, profile: safeProfile, setProfile,
    showProfilePrompt, setShowProfilePrompt,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    selectedDate, setSelectedDate,
    onSaveTask: handleSaveTask,
    onDeleteTask: handleDeleteTask,
    onImportTasks: handleImportTasks,
    onReorder: handleReorderTasks,
    quickAddValue, setQuickAddValue,
    onQuickAddTask: handleQuickAddTask,
    isDarkMode, onToggleDarkMode: () => setIsDarkMode(prev => !prev),
  };

  if (isDesktop) {
    return <DesktopLayout currentView={currentView} setCurrentView={setCurrentView} screenKey={screenKey} goToSchedule={goToSchedule} goToHome={goToHome} {...sharedProps} />;
  }

  return <MobileLayout currentView={currentView} screenKey={screenKey} goToSchedule={goToSchedule} goToHome={goToHome} {...sharedProps} />;
}

// ─────────────────────────────────────────────
// MOBILE LAYOUT
// ─────────────────────────────────────────────
function MobileLayout({ currentView, screenKey, goToSchedule, goToHome, isDarkMode, tasks, profile, setProfile, showProfilePrompt, setShowProfilePrompt, searchQuery, setSearchQuery, activeFilter, setActiveFilter, selectedDate, setSelectedDate, onSaveTask, onDeleteTask, onImportTasks, onReorder, quickAddValue, setQuickAddValue, onQuickAddTask, onToggleDarkMode }) {
  return (
    <div className={`w-full transition-colors duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {currentView === 'home' ? (
        <HomeScreen
          key={`home-${screenKey}`}
          enterClass="screen-enter-left"
          isMobile={true}
          onNavigate={goToSchedule}
          tasks={tasks} profile={profile} setProfile={setProfile}
          showProfilePrompt={showProfilePrompt} setShowProfilePrompt={setShowProfilePrompt}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          activeFilter={activeFilter} setActiveFilter={setActiveFilter}
          onSaveTask={onSaveTask} onDeleteTask={onDeleteTask} onImportTasks={onImportTasks}
          quickAddValue={quickAddValue} setQuickAddValue={setQuickAddValue} onQuickAddTask={onQuickAddTask}
          isDarkMode={isDarkMode} onToggleDarkMode={onToggleDarkMode}
        />
      ) : (
        <ScheduleScreen
          key={`schedule-${screenKey}`}
          enterClass="screen-enter-right"
          isMobile={true}
          onNavigate={goToHome}
          tasks={tasks} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          onSaveTask={onSaveTask} onDeleteTask={onDeleteTask} onReorder={onReorder}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DESKTOP LAYOUT
// ─────────────────────────────────────────────
function DesktopLayout({ currentView, setCurrentView, screenKey, goToSchedule, goToHome, isDarkMode, onToggleDarkMode, tasks, profile, setProfile, showProfilePrompt, setShowProfilePrompt, searchQuery, setSearchQuery, activeFilter, setActiveFilter, selectedDate, setSelectedDate, onSaveTask, onDeleteTask, onImportTasks, onReorder, quickAddValue, setQuickAddValue, onQuickAddTask }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  const safeProfile = profile || { name: '', seed: 'User' };

  return (
    <div className={`flex transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-slate-100'}`}
      style={{ minHeight: '100dvh' }}>

      {/* Sidebar */}
      <aside className={`w-60 flex-shrink-0 flex flex-col border-r transition-colors duration-500 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
        style={{ minHeight: '100dvh', position: 'sticky', top: 0 }}>

        {/* Logo */}
        <div className={`px-6 pt-8 pb-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TaskManager</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Menu</p>
          {[
            { id: 'home',     label: 'Home',     icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { id: 'schedule', label: 'Schedule', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
          ].map(({ id, label, icon }) => {
            const isActive = currentView === id;
            return (
              <button key={id}
                onClick={() => id === 'home' ? goToHome() : goToSchedule()}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1 text-sm font-semibold transition-smooth-fast hover-scale ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : isDarkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
                {label}
              </button>
            );
          })}

          {/* Quick Add in sidebar */}
          <div className="mt-6">
            <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Quick Add</p>
            <form onSubmit={onQuickAddTask} className="px-1">
              <input
                type="text"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                placeholder="Add a task..."
                className={`w-full rounded-2xl px-3 py-2.5 text-sm outline-none transition-smooth mb-2 ${isDarkMode ? 'bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500' : 'bg-gray-100 text-gray-700 placeholder-gray-400 focus:bg-blue-50 focus:ring-2 focus:ring-blue-300'}`}
              />
              <button type="submit" className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95">
                + Add Task
              </button>
            </form>
          </div>

          {/* Task stats */}
          <div className="mt-6 px-1">
            <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Today</p>
            <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {[
                { label: 'Total',    count: tasks.filter(t => t.date === getTodayDateString()).length, color: 'text-blue-500'   },
                { label: 'To-Do',   count: tasks.filter(t => t.date === getTodayDateString() && t.status === 'To-Do').length,   color: 'text-pink-500'   },
                { label: 'Done',    count: tasks.filter(t => t.date === getTodayDateString() && t.status === 'Done').length,    color: 'text-green-500'  },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between items-center py-1">
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom: Profile + Dark mode */}
        <div className={`px-4 py-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setIsProfileEditorOpen(true)} className="flex items-center gap-3 flex-1 min-w-0 hover-scale transition-smooth-fast">
              <AvatarCircle label={safeProfile.name} seed={safeProfile.seed} className="w-9 h-9 flex-shrink-0" />
              <div className="min-w-0 text-left">
                <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{safeProfile.name || 'Set your name'}</p>
                <p className={`text-xs truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>View profile</p>
              </div>
            </button>
            <button onClick={onToggleDarkMode} aria-label="Toggle dark mode"
              className={`p-2 rounded-full border transition-smooth hover-scale active:scale-95 ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-200' : 'border-gray-200 bg-white text-gray-600'}`}>
              {isDarkMode
                ? <span className="text-base leading-none">🌞</span>
                : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
              }
            </button>
          </div>
          <button onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-smooth-fast ${isDarkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </button>
        </div>

        {/* Modals anchored to sidebar */}
        {isSettingsOpen && (
          <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} tasks={tasks} onImportTasks={onImportTasks} onOpenProfileEditor={() => { setIsSettingsOpen(false); setIsProfileEditorOpen(true); }} />
        )}
        {(isProfileEditorOpen || showProfilePrompt) && (
          <ProfileModal isOpen={true} force={showProfilePrompt} onClose={() => setIsProfileEditorOpen(false)} profile={safeProfile}
            setProfile={(p) => { setProfile(p); setIsProfileEditorOpen(false); setShowProfilePrompt(false); }} />
        )}
      </aside>

      {/* Main content */}
      <main className={`flex-1 min-w-0 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-slate-50'}`}
        style={{ minHeight: '100dvh' }}>
        {currentView === 'home' ? (
          <DesktopHomeContent
            key={`dhome-${screenKey}`}
            tasks={tasks} profile={safeProfile}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            activeFilter={activeFilter} setActiveFilter={setActiveFilter}
            onSaveTask={onSaveTask} onDeleteTask={onDeleteTask}
            isDarkMode={isDarkMode}
          />
        ) : (
          <DesktopScheduleContent
            key={`dsched-${screenKey}`}
            tasks={tasks} selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            onSaveTask={onSaveTask} onDeleteTask={onDeleteTask} onReorder={onReorder}
            isDarkMode={isDarkMode}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// DESKTOP HOME CONTENT
// ─────────────────────────────────────────────
function DesktopHomeContent({ tasks, profile, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onSaveTask, onDeleteTask, isDarkMode }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const todayTasks = tasks.filter(t => t.date === getTodayDateString());
  const displayTasks = todayTasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || task.status === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  return (
    <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 stagger-section">
        <div>
          <p className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Good morning, {profile.name || 'there'}!</p>
          <h1 className="text-3xl font-bold">
            You have <span className="text-blue-500">{todayTasks.length} tasks</span> today
          </h1>
        </div>
        <button onClick={() => setIsCreatingTask(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 transition-smooth hover-scale active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" /></svg>
          New Task
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 stagger-section">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none font-medium transition-smooth ${isDarkMode ? 'bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500' : 'bg-white text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-200 shadow-sm'}`} />
        </div>
        <div className="flex gap-2">
          {['All', 'To-Do', 'Progress', 'Done'].map((status, i) => {
            const isActive = activeFilter === status;
            const colors = ['bg-blue-100 text-blue-700', 'bg-pink-100 text-pink-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700'];
            return (
              <button key={status} onClick={() => setActiveFilter(status)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-smooth-fast hover-scale active:scale-95 ${
                  isActive ? colors[i] + ' shadow-sm' : isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-500 hover:bg-gray-100 shadow-sm'
                }`}>
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task grid */}
      <div className="stagger-section">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {activeFilter === 'All' ? "Today's Tasks" : `${activeFilter} Tasks`}
            {(searchQuery || activeFilter !== 'All') && <span className={`ml-2 text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>({displayTasks.length} shown)</span>}
          </h2>
        </div>
        {displayTasks.length === 0 ? (
          <div className={`w-full p-12 text-center rounded-[30px] border-2 border-dashed animate-fadeIn ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <p className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No tasks match your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayTasks.map((task) => (
              <div key={task.id} className="stagger-item">
                <TaskCard task={task} onClick={() => setEditingTask(task)} desktop />
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal isOpen={!!editingTask || isCreatingTask} task={editingTask}
        onClose={() => { setEditingTask(null); setIsCreatingTask(false); }}
        onSubmit={(data) => { onSaveTask(data); setEditingTask(null); setIsCreatingTask(false); }}
        onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// DESKTOP SCHEDULE CONTENT
// ─────────────────────────────────────────────
function DesktopScheduleContent({ tasks, selectedDate, setSelectedDate, onSaveTask, onDeleteTask, onReorder, isDarkMode }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const weekDates = generateWeek();
  const displayTasks = tasks.filter(t => t.date === selectedDate);

  const dragItem = useRef();
  const dragOverItem = useRef();

  const handleDragStart = (e, i) => { dragItem.current = i; };
  const handleDragEnter = (e, i) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current == null || dragOverItem.current == null || dragOverItem.current === dragItem.current) {
      dragItem.current = null; dragOverItem.current = null; return;
    }
    const reordered = [...displayTasks];
    const item = reordered.splice(dragItem.current, 1)[0];
    if (!item) { dragItem.current = null; dragOverItem.current = null; return; }
    reordered.splice(dragOverItem.current, 0, item);
    dragItem.current = null; dragOverItem.current = null;
    onReorder([...tasks.filter(t => t.date !== selectedDate), ...reordered]);
  };

  return (
    <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 stagger-section">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Drag tasks to reorder them</p>
        </div>
        <button onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-semibold shadow-md shadow-blue-200 hover:bg-blue-700 transition-smooth hover-scale active:scale-95">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" /></svg>
          Add Task
        </button>
      </div>

      {/* Week strip */}
      <div className={`flex gap-2 mb-8 p-4 rounded-3xl stagger-section ${isDarkMode ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
        {weekDates.map((day) => {
          const isActive = day.dateString === selectedDate;
          return (
            <button key={day.dateString} onClick={() => setSelectedDate(day.dateString)}
              className={`flex flex-col items-center flex-1 py-3 rounded-2xl cursor-pointer transition-smooth-fast hover-scale ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <span className={`text-[10px] font-medium mb-1 ${isActive ? 'text-blue-200' : ''}`}>{day.dayName}</span>
              <span className={`text-sm font-bold`}>{day.dayNumber}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="stagger-section">
        <div className="relative" style={{ paddingLeft: '2rem' }}>
          <div className={`absolute left-0 top-0 bottom-0 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ left: '8px' }}></div>
          {displayTasks.length === 0 ? (
            <div className={`p-12 text-center rounded-[30px] border-2 border-dashed ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No tasks for this day.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayTasks.map((task, i) => (
                <div key={task.id} className="stagger-item">
                  <TimelineItem task={task} onClick={() => setEditingTask(task)}
                    draggable onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnter={(e) => handleDragEnter(e, i)} onDragEnd={handleDragEnd} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskModal isOpen={isAddingTask || !!editingTask} task={editingTask} selectedDate={selectedDate}
        onClose={() => { setIsAddingTask(false); setEditingTask(null); }}
        onSubmit={(data) => { onSaveTask(data); setIsAddingTask(false); setEditingTask(null); }}
        onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME SCREEN (mobile)
// ─────────────────────────────────────────────
function HomeScreen({ onNavigate, tasks, profile, setProfile, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onSaveTask, onDeleteTask, onImportTasks, quickAddValue, setQuickAddValue, onQuickAddTask, isDarkMode, onToggleDarkMode, showProfilePrompt, setShowProfilePrompt, enterClass }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  const displayTasks = tasks
    .filter(task => {
      const isToday = task.date === getTodayDateString();
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || task.status === activeFilter;
      return isToday && matchesSearch && matchesFilter;
    })
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 overflow-y-auto no-scrollbar transition-colors duration-500 ${enterClass || ''}`}
      style={{ minHeight: '100dvh', paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingLeft: 'max(1.5rem, env(safe-area-inset-left))', paddingRight: 'max(1.5rem, env(safe-area-inset-right))' }}>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 stagger-section">
        <button onClick={() => setIsSettingsOpen(true)} aria-label="Open settings"
          className="touch-target bg-gray-50 rounded-full hover:bg-gray-100 transition-smooth-fast hover-scale dark:bg-gray-800 dark:hover:bg-gray-700">
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onToggleDarkMode} aria-label="Toggle dark mode"
            className="touch-target rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-smooth hover-scale dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {isDarkMode ? <span className="text-lg leading-none">🌞</span> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>}
          </button>
          <button onClick={() => setIsCreatingTask(true)} aria-label="Add task"
            className="touch-target bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-smooth-fast shadow-sm hover-glow">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" /></svg>
          </button>
          <button onClick={() => setIsProfileEditorOpen(true)} aria-label="Edit profile"
            className="w-11 h-11 rounded-full overflow-hidden shadow-sm hover:ring-2 ring-blue-300 transition-smooth hover-scale">
            <AvatarCircle label={profile.name} seed={profile.seed} className="w-full h-full rounded-full" />
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <form onSubmit={onQuickAddTask} className="mb-6 rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 p-4 shadow-sm dark:border-gray-700 dark:from-gray-800/80 dark:via-gray-800/70 dark:to-gray-800/80 stagger-section">
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-300">Quick Add</label>
        <div className="flex items-center gap-2">
          <input type="text" value={quickAddValue} onChange={(e) => setQuickAddValue(e.target.value)}
            placeholder="Add a task and press Enter"
            className="flex-1 rounded-2xl border border-transparent bg-white/80 px-3 py-2.5 text-sm text-gray-700 outline-none transition-smooth placeholder:text-gray-400 focus:border-blue-300 focus:bg-white dark:bg-gray-900/80 dark:text-gray-100" />
          <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-smooth hover:bg-blue-700 active:scale-95">Add</button>
        </div>
      </form>

      {/* Greeting */}
      <div className="mb-6 stagger-section">
        <p className="text-gray-500 text-sm mb-1 dark:text-gray-400">Good Morning, {profile.name}!</p>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight dark:text-white">
          You have <span className="text-blue-500">{tasks.filter(t => t.date === getTodayDateString()).length} tasks</span><br />today 👍
        </h1>
        {(searchQuery || activeFilter !== 'All') && (
          <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">Showing {displayTasks.length} of {tasks.filter(t => t.date === getTodayDateString()).length} tasks.</p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 stagger-section">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search today's tasks..."
          className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 placeholder-gray-400 font-medium transition-smooth focus:bg-blue-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
      </div>

      {/* Filter pills */}
      <div className="flex justify-between mb-6 gap-2 stagger-section">
        {['All', 'To-Do', 'Progress', 'Done'].map((status, i) => {
          const isActive = activeFilter === status;
          const bgClass = status === 'All' ? 'bg-blue-100 text-blue-600' : i===1 ? 'bg-pink-100 text-pink-500' : i===2 ? 'bg-yellow-100 text-yellow-500' : 'bg-green-100 text-green-500';
          return (
            <div key={status} onClick={() => setActiveFilter(status)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-3xl transition-smooth-fast cursor-pointer stagger-item ${isActive ? 'bg-gray-100 ring-2 ring-gray-200 scale-105 dark:bg-gray-700 dark:ring-gray-600' : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 ${bgClass}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{status}</span>
            </div>
          );
        })}
      </div>

      {/* Tasks header */}
      <div className="flex justify-between items-end mb-3 stagger-section">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Tasks</h2>
        <button onClick={onNavigate} className="text-xs text-blue-600 font-bold hover:text-blue-800 transition dark:text-blue-400 touch-target">Schedule ➔</button>
      </div>

      {/* Task cards */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar stagger-section" style={{ WebkitOverflowScrolling: 'touch' }}>
        {displayTasks.length === 0 ? (
          <div className="w-full p-8 text-center bg-gray-50 rounded-[30px] border-2 border-dashed border-gray-200 animate-fadeIn dark:bg-gray-800 dark:border-gray-700">
            <p className="text-gray-400 font-medium text-sm">No tasks match.</p>
          </div>
        ) : (
          displayTasks.map((task) => (
            <div key={task.id} className="stagger-item flex-shrink-0">
              <TaskCard task={task} onClick={() => setEditingTask(task)} />
            </div>
          ))
        )}
      </div>

      <TaskModal isOpen={!!editingTask || isCreatingTask} task={editingTask}
        onClose={() => { setEditingTask(null); setIsCreatingTask(false); }}
        onSubmit={(data) => { onSaveTask(data); setEditingTask(null); setIsCreatingTask(false); }}
        onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} tasks={tasks} onImportTasks={onImportTasks} onOpenProfileEditor={() => { setIsSettingsOpen(false); setIsProfileEditorOpen(true); }} />
      <ProfileModal isOpen={isProfileEditorOpen || showProfilePrompt} force={showProfilePrompt}
        onClose={() => setIsProfileEditorOpen(false)} profile={profile || { name: '', seed: 'User' }}
        setProfile={(p) => { setProfile(p); setIsProfileEditorOpen(false); setShowProfilePrompt(false); }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SCHEDULE SCREEN (mobile)
// ─────────────────────────────────────────────
function ScheduleScreen({ onNavigate, tasks, selectedDate, setSelectedDate, onSaveTask, onDeleteTask, onReorder, isDarkMode, enterClass }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const weekDates = generateWeek();
  const displayTasks = tasks.filter(t => t.date === selectedDate);

  const dragItem = useRef();
  const dragOverItem = useRef();
  const handleDragStart = (e, i) => { dragItem.current = i; };
  const handleDragEnter = (e, i) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current == null || dragOverItem.current == null || dragOverItem.current === dragItem.current) {
      dragItem.current = null; dragOverItem.current = null; return;
    }
    const reordered = [...displayTasks];
    const item = reordered.splice(dragItem.current, 1)[0];
    if (!item) { dragItem.current = null; dragOverItem.current = null; return; }
    reordered.splice(dragOverItem.current, 0, item);
    dragItem.current = null; dragOverItem.current = null;
    onReorder([...tasks.filter(t => t.date !== selectedDate), ...reordered]);
  };

  return (
    <div className={`flex flex-col relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} ${enterClass || ''}`}
      style={{ minHeight: '100dvh', paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingLeft: 'max(1.5rem, env(safe-area-inset-left))', paddingRight: 'max(1.5rem, env(safe-area-inset-right))' }}>

      {/* Header */}
      <div className="flex justify-between items-center mb-2 stagger-section">
        <button onClick={onNavigate}
          className={`touch-target rounded-full shadow-sm hover:shadow-md transition hover-scale ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}`}>
          <svg className={`w-5 h-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <button onClick={() => setIsAddingTask(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center gap-2 hover-scale active:scale-95">
          <span>+</span> Add Task
        </button>
      </div>

      <p className={`text-xs mb-4 stagger-section ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Drag tasks up or down to reorder them.</p>

      {/* Week strip */}
      <div className={`flex justify-between items-center mb-6 p-3 rounded-3xl shadow-sm overflow-x-auto no-scrollbar gap-1 transition-colors duration-500 stagger-section ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {weekDates.map((day) => {
          const isActive = day.dateString === selectedDate;
          return (
            <div key={day.dateString} onClick={() => setSelectedDate(day.dateString)}
              className="flex flex-col items-center cursor-pointer min-w-[36px] py-1 px-1">
              <span className={`text-[10px] font-medium mb-1 ${isActive ? 'text-blue-600' : isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>{day.dayName}</span>
              <span className={`text-sm font-bold ${isActive ? 'text-blue-600' : isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{day.dayNumber}</span>
              {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-1"></div>}
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative pb-6">
        <div className={`absolute top-2 bottom-0 w-px z-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ left: '8px' }}></div>
        <div className="space-y-5 relative z-10" style={{ paddingLeft: '2rem' }}>
          {displayTasks.length === 0 ? (
            <p className={`text-sm mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No tasks scheduled.</p>
          ) : (
            displayTasks.map((task, index) => (
              <div key={task.id} className="stagger-item">
                <TimelineItem task={task} onClick={() => setEditingTask(task)}
                  draggable onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEnd} />
              </div>
            ))
          )}
        </div>
      </div>

      <TaskModal isOpen={isAddingTask || !!editingTask} task={editingTask} selectedDate={selectedDate}
        onClose={() => { setIsAddingTask(false); setEditingTask(null); }}
        onSubmit={(data) => { onSaveTask(data); setIsAddingTask(false); setEditingTask(null); }}
        onDelete={(id) => { onDeleteTask(id); setEditingTask(null); }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────
function TaskCard({ task, onClick, desktop }) {
  const t = taskThemes[task.theme] || taskThemes.blue;
  const priority = getPriorityStyle(task.priority || 'Medium');
  return (
    <div onClick={onClick}
      className={`${desktop ? 'w-full' : 'w-[200px]'} ${t.bg} rounded-[28px] p-5 text-white shadow-lg cursor-pointer hover-lift active:scale-95`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-bold text-base truncate">{task.title}</h3>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold flex-shrink-0 ${priority.badge}`}>{task.priority || 'Medium'}</span>
      </div>
      <p className={`${t.text} text-xs mb-4 leading-relaxed line-clamp-2`}>{task.desc}</p>
      <div className="flex items-center gap-2 mb-4">
        <div className={`text-xs font-medium ${t.inner} inline-block px-2 py-1 rounded-lg`}>{task.time}</div>
        <div className={`text-[10px] font-bold ${t.inner} inline-block px-2 py-1 rounded-lg uppercase`}>{task.status}</div>
      </div>
      <div className="flex justify-between items-center text-xs font-bold mb-1"><span>Progress</span><span>{task.progress}%</span></div>
      <div className={`w-full ${t.inner} rounded-full h-1.5 overflow-hidden`}>
        <div className="bg-white h-1.5 rounded-full transition-smooth" style={{ width: `${task.progress}%` }}></div>
      </div>
    </div>
  );
}

function TimelineItem({ task, onClick, draggable, onDragStart, onDragEnter, onDragEnd }) {
  const isDone = task.status === 'Done';
  return (
    <div className="relative cursor-grab" onClick={onClick}
      draggable={draggable} onDragStart={onDragStart} onDragEnter={onDragEnter}
      onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()}>
      <div className={`absolute top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-colors ${isDone ? 'bg-gray-300' : 'bg-rose-500 ring-2 ring-rose-200'}`}
        style={{ left: '-1.5rem', transform: 'translateX(-50%)' }}></div>
      <div className={`p-5 rounded-3xl shadow-sm hover-lift ${isDone ? 'bg-gray-100 text-gray-800' : 'bg-rose-500 text-white'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs opacity-80 flex-shrink-0">⋮⋮</span>
            <h3 className="font-bold text-sm truncate">{task.title}</h3>
          </div>
          <span className={`text-xs font-semibold whitespace-nowrap ml-2 flex-shrink-0 ${isDone ? 'text-gray-500' : 'text-white/90'}`}>{task.time}</span>
        </div>
        <p className={`text-xs leading-relaxed line-clamp-2 ${isDone ? 'text-gray-500' : 'text-white/80'}`}>{task.desc}</p>
      </div>
    </div>
  );
}

function TaskModal({ isOpen, task, selectedDate, onClose, onSubmit, onDelete }) {
  const [formData, setFormData] = useState({ title: '', time: '', date: getTodayDateString(), desc: '', progress: 0, status: 'To-Do', priority: 'Medium' });
  const [timeInput, setTimeInput] = useState(getCurrentTimeInput());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
      setTimeInput(formatTimeForInput(task.time) || getCurrentTimeInput());
    } else {
      setFormData({ title: '', time: '', date: selectedDate || getTodayDateString(), desc: '', progress: 0, status: 'To-Do', priority: 'Medium' });
      setTimeInput(getCurrentTimeInput());
    }
    setShowConfirmDelete(false);
    setFormError('');
  }, [task, isOpen, selectedDate]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const displayTime = formatTimeForDisplay(timeInput);
    if (!displayTime) { setFormError('Please select a valid time.'); return; }
    if (!formData.title?.trim()) { setFormError('Title is required.'); return; }
    setFormError('');
    onSubmit({ ...formData, time: displayTime });
  };

  if (showConfirmDelete) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl text-center dark:bg-gray-900 animate-modalIn">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Delete Task?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl hover:bg-gray-200 transition">Cancel</button>
            <button type="button" onClick={() => onDelete(task.id)} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-200">Delete</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-[30px] p-6 shadow-2xl no-scrollbar flex flex-col animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{task ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="touch-target bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-smooth-fast hover-scale">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Title</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Date</label>
              <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Time</label>
              <input type="time" required value={timeInput} onChange={e => setTimeInput(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300">
              <option value="To-Do">To-Do</option>
              <option value="Progress">Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Priority</label>
            <select value={formData.priority || 'Medium'} onChange={e => setFormData({...formData, priority: e.target.value})}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Progress: {formData.progress}%</label>
            <input type="range" min="0" max="100" value={formData.progress}
              onChange={e => setFormData({...formData, progress: Number(e.target.value)})}
              className="w-full accent-blue-600 transition-smooth" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Description</label>
            <textarea rows="2" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium resize-none transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300"></textarea>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-3 pt-2">
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
  useEffect(() => { if (isOpen) setImportMessage(null); }, [isOpen]);
  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'tasks_backup.json';
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
      setImportMessage({ type: 'success', text: 'Tasks exported successfully.' });
    } catch (e) { setImportMessage({ type: 'error', text: 'Failed to export tasks.' }); }
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) { setImportMessage({ type: 'error', text: 'No file selected.' }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const result = onImportTasks(parsed);
        setImportMessage(result?.success ? { type: 'success', text: result.message } : { type: 'error', text: result?.message || 'Import failed.' });
      } catch { setImportMessage({ type: 'error', text: 'Invalid file format.' }); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Settings</h3>
          <button onClick={onClose} className="touch-target bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-smooth-fast hover-scale">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Export or import your tasks as a JSON backup file.</p>
          <button onClick={handleExport} className="w-full bg-gray-900 dark:bg-gray-700 text-white font-bold py-3 rounded-2xl hover:bg-gray-800 transition-smooth hover-scale active:scale-95">Export Tasks (JSON)</button>
          <label className="w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-smooth hover-scale active:scale-95 cursor-pointer">
            Import Tasks (JSON)
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importMessage && <p className={`text-sm ${importMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`} role="alert">{importMessage.text}</p>}
          <button onClick={() => { onClose(); onOpenProfileEditor(); }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95">Edit Profile</button>
          <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-smooth hover-scale active:scale-95">Close</button>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ isOpen, onClose, profile, setProfile, force = false }) {
  const [draftProfile, setDraftProfile] = useState(profile || { name: '', seed: '' });
  useEffect(() => { if (isOpen) setDraftProfile(profile || { name: '', seed: '' }); }, [isOpen, profile]);
  if (!isOpen) return null;

  const handleSave = () => {
    if (!draftProfile.name.trim()) return;
    const finalProfile = { ...draftProfile, seed: draftProfile.name.trim() };
    try { localStorage.setItem('taskManagerProfile', JSON.stringify(finalProfile)); } catch {}
    setProfile(finalProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl animate-modalIn dark:bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Profile</h3>
          {!force && (
            <button onClick={onClose} className="touch-target bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-smooth-fast hover-scale">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 ml-1">Your Name</label>
            <input type="text" value={draftProfile.name} onChange={(e) => setDraftProfile({...draftProfile, name: e.target.value})}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-2xl py-3 px-4 outline-none text-sm font-medium transition-smooth focus:bg-blue-50 focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="flex items-center gap-4">
            <AvatarCircle label={draftProfile.name} seed={draftProfile.name} className="w-20 h-20 rounded-2xl text-2xl" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Avatar is generated from the first letter of your name.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-smooth hover-scale active:scale-95">Save</button>
            {!force && <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-smooth hover-scale active:scale-95">Cancel</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
