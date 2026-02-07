import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Calendar as CalIcon, List, Lock, LogOut, User, Shield, Settings, Users, Trash2 } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

const API_BASE = "/api/reservation";

const TIME_SLOTS = [];
for (let i = 10; i <= 23; i++) {
  TIME_SLOTS.push(`${i}:00`);
}

const getStudentColor = (name) => {
  const colors = [
    'bg-red-200 text-red-900 border-red-300', 'bg-orange-200 text-orange-900 border-orange-300',
    'bg-green-200 text-green-900 border-green-300', 'bg-blue-200 text-blue-900 border-blue-300',
    'bg-purple-200 text-purple-900 border-purple-300', 'bg-yellow-200 text-yellow-900 border-yellow-300'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return colors[Math.abs(hash) % colors.length];
};

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]); 
  const [isTeacher, setIsTeacher] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPwChangeModalOpen, setIsPwChangeModalOpen] = useState(false);
  const [isStudentManageModalOpen, setIsStudentManageModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [inputStudent, setInputStudent] = useState("");
  const [newStudentName, setNewStudentName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const schedRes = await fetch(`${API_BASE}/schedules`);
      if (schedRes.ok) setSchedules(await schedRes.json());
      
      const studRes = await fetch(`${API_BASE}/students`);
      if (studRes.ok) setStudents(await studRes.json());

    } catch (error) {
      console.error("데이터 로딩 에러:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  const handleTeacherLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const success = await res.json();
      if (success) {
        setIsTeacher(true);
        setIsLoginModalOpen(false);
        setPassword("");
        alert("선생님으로 로그인되었습니다.");
      } else {
        alert("비밀번호가 틀렸습니다.");
      }
    } catch (err) {
      alert("로그인 중 오류 발생");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) return alert("4자리 이상 입력하세요.");
    try {
      await fetch(`${API_BASE}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      alert("비밀번호가 변경되었습니다.");
      setIsPwChangeModalOpen(false);
      setNewPassword("");
    } catch (e) {
      alert("변경 실패");
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return alert("이름을 입력하세요.");
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStudentName }),
      });
      if (res.ok) {
        setNewStudentName("");
        fetchData(); 
      } else {
        alert("이미 존재하는 이름이거나 오류가 발생했습니다.");
      }
    } catch (e) {
      alert("학생 등록 실패");
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`'${name}' 학생을 삭제하시겠습니까?`)) return;
    try {
      await fetch(`${API_BASE}/students/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  const isPastTime = (dateStr, timeStr) => {
    const now = new Date();
    const target = new Date(`${dateStr}T${timeStr.padStart(5, '0')}`);
    return target < now;
  };

  const toggleRequest = async (dateStr, time) => {
    if (isPastTime(dateStr, time)) {
      alert("지난 시간은 예약할 수 없습니다.");
      return;
    }
    if (isTeacher) return;

    const isSlotConfirmed = schedules.some(s => s.scheduleDate === dateStr && s.scheduleTime === time && s.status === 'confirmed');
    if (isSlotConfirmed) {
      alert("이미 마감된 시간입니다.");
      return;
    }

    if (!inputStudent) {
      alert("학생 이름을 먼저 입력해주세요 (우측 상단)");
      return;
    }
    const isRegistered = students.some(s => s.name === inputStudent);
    if (!isRegistered) {
      alert("등록되지 않은 학생 이름입니다. 선생님께 문의하세요.");
      return;
    }

    const existing = schedules.find(s => s.scheduleDate === dateStr && s.scheduleTime === time && s.studentName === inputStudent);
    
    if (existing) {
      if (!window.confirm("신청을 취소하시겠습니까?")) return;
      await fetch(`${API_BASE}/schedules/${existing.id}`, { method: "DELETE" });
    } else {
      try {
        const res = await fetch(`${API_BASE}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: inputStudent,
            scheduleDate: dateStr,
            scheduleTime: time,
            status: "pending"
          })
        });
        if (!res.ok) {
            alert("신청 실패: 등록된 학생만 신청 가능합니다.");
        }
      } catch (e) {
        alert("서버 통신 오류");
      }
    }
    fetchData();
  };

  const handleScheduleClick = async (schedule) => {
    if (isPastTime(schedule.scheduleDate, schedule.scheduleTime)) {
      alert("지난 스케줄은 변경할 수 없습니다.");
      return;
    }

    if (isTeacher) {
      if (schedule.status === 'confirmed') {
        if (window.confirm(`'${schedule.studentName}' 학생의 예약을 취소하시겠습니까?`)) {
          await fetch(`${API_BASE}/schedules/${schedule.id}`, { method: "DELETE" });
        }
      } else {
        if (window.confirm(`'${schedule.studentName}' 학생을 확정하시겠습니까?`)) {
          await fetch(`${API_BASE}/schedules/${schedule.id}/confirm`, { method: "POST" });
        }
      }
    } else {
      if (schedule.studentName === inputStudent) {
        if (window.confirm("신청을 취소하시겠습니까?")) {
          await fetch(`${API_BASE}/schedules/${schedule.id}`, { method: "DELETE" });
        }
      }
    }
    fetchData();
  };

  const getVisibleSchedules = (cellSchedules) => {
    if (isTeacher) {
      return cellSchedules.map(s => ({ ...s, displayName: s.studentName, isMasked: false }));
    }
    return cellSchedules
      .filter(s => s.studentName === inputStudent)
      .map(s => ({ ...s, displayName: s.studentName, isMasked: false }));
  };

  // 주간 뷰 (Week View)
  const renderWeekView = () => {
    // ★ [수정] weekStartsOn: 1 (월요일 시작)
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="flex-1 overflow-auto bg-white">
        <div className="min-w-[768px]"> 
          <div className="grid grid-cols-8 border-b sticky top-0 bg-white z-10 shadow-sm">
            <div className="p-2 text-center font-bold border-r bg-gray-50 text-gray-500">시간</div>
            {days.map((day) => (
              <div key={day.toString()} className={`p-2 text-center border-r font-semibold ${isSameDay(day, new Date()) ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'}`}>
                <div className="text-xs text-gray-500">{format(day, 'EEE', { locale: ko })}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          
          <div className="divide-y">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="grid grid-cols-8 min-h-[60px]">
                <div className="p-2 text-center text-xs text-gray-500 border-r bg-gray-50 flex items-center justify-center font-medium">
                  {time}
                </div>
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const slotKey = `${dateStr}-${time}`;
                  const rawData = schedules.filter(s => s.scheduleDate === dateStr && s.scheduleTime === time);
                  const cellData = getVisibleSchedules(rawData);
                  
                  const isPast = isPastTime(dateStr, time);
                  let bgColorClass = isPast ? "bg-gray-100 cursor-not-allowed" : "hover:bg-indigo-50 cursor-pointer";

                  return (
                    <div
                      key={slotKey}
                      onClick={() => !isPast && toggleRequest(dateStr, time)}
                      className={`p-1 border-r relative transition-colors duration-200 ${bgColorClass}`}
                    >
                      {cellData.map((schedule) => (
                        <div
                          key={schedule.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isPast && !schedule.isMasked) handleScheduleClick(schedule);
                          }}
                          className={`text-xs p-1.5 mb-1 rounded shadow-sm flex items-center justify-between group animate-fadeIn 
                            ${schedule.status === 'confirmed' 
                                ? 'bg-yellow-300 text-yellow-900 border-yellow-400 font-bold ring-2 ring-yellow-200' 
                                : isTeacher 
                                  ? 'bg-white border-2 border-indigo-500 text-indigo-700 shadow-md' 
                                  : getStudentColor(schedule.studentName)}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {schedule.status === 'confirmed' && <Shield size={10} className="flex-shrink-0" />}
                            <span className="truncate">{schedule.displayName}</span>
                          </div>
                          {!isPast && !schedule.isMasked && (
                             <X size={12} className="opacity-0 group-hover:opacity-100 cursor-pointer hover:bg-black/10 rounded" />
                          )}
                        </div>
                      ))}
                      {isTeacher && !isMobile && !isPast && cellData.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100">
                          <div className="bg-indigo-100 text-indigo-600 rounded-full p-1 shadow-sm"><span className="text-xs font-bold">+</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 월간 뷰는 일요일 시작 유지 (달력 관례)
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    let week = [];
    
    calendarDays.forEach((day) => {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });

    return (
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="grid grid-cols-7 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
            <div key={idx} className={`text-center font-bold ${idx === 0 ? 'text-red-500' : 'text-gray-600'}`}>
              {dayName}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {weeks.map((weekRow, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1 h-32">
              {weekRow.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);
                const daySchedules = schedules.filter(s => s.scheduleDate === dateStr);
                const visibleSchedules = getVisibleSchedules(daySchedules);

                return (
                  <div key={day.toString()} className={`border rounded-lg p-2 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}>
                    <div className={`text-sm font-bold mb-1 ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="flex-1 overflow-hidden space-y-1">
                      {visibleSchedules.slice(0, 3).map(s => (
                        <div key={s.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate
                          ${s.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 border' : 'bg-indigo-50 text-indigo-700 border-indigo-100 border'}`}>
                          {s.displayName}
                        </div>
                      ))}
                      {visibleSchedules.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-1">+ {visibleSchedules.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-screen md:h-[90vh] max-w-6xl bg-white shadow-2xl md:rounded-2xl flex flex-col overflow-hidden relative">
        
        {/* 헤더 */}
        <header className="p-4 border-b bg-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 z-20">
          <div className="flex w-full md:w-auto justify-between items-center gap-4">
            <h1 className="text-xl md:text-2xl font-extrabold text-indigo-600 tracking-tight flex items-center gap-2">
              <CalIcon className="text-indigo-600" /> Woody Service
            </h1>
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <button onClick={() => setViewMode('week')} className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>주간</button>
              <button onClick={() => setViewMode('month')} className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>월간</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border w-full md:w-auto justify-between md:justify-start">
              <button onClick={() => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronLeft size={18}/></button>
              <span className="font-bold text-base md:text-lg text-gray-700 min-w-[120px] text-center">
                {format(currentDate, "yyyy년 M월", { locale: ko })}
                {/* ★ [수정] weekStartsOn: 1 (헤더 날짜 범위 표시) */}
                {viewMode === 'week' && <span className="text-xs md:text-sm font-normal text-gray-500 ml-1">({format(startOfWeek(currentDate, {weekStartsOn:1}), 'd')}~{format(endOfWeek(currentDate, {weekStartsOn:1}), 'd')}일)</span>}
              </span>
              <button onClick={() => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))} className="p-1 hover:bg-gray-200 rounded text-gray-600"><ChevronRight size={18}/></button>
              <button onClick={() => setCurrentDate(new Date())} className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200 whitespace-nowrap">오늘</button>
            </div>

            {!isTeacher ? (
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg border focus-within:ring-2 focus-within:ring-indigo-300 flex-1 md:flex-none">
                  <User size={16} className="text-gray-400 mr-2"/>
                  <input 
                    type="text" 
                    placeholder="이름 (등록된 학생)" 
                    className="bg-transparent outline-none text-sm font-bold text-gray-700 w-full md:w-24"
                    value={inputStudent}
                    onChange={(e) => setInputStudent(e.target.value)} 
                  />
                </div>
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 text-sm font-bold transition-colors whitespace-nowrap">
                  <Lock size={14}/> 선생님
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full md:w-auto justify-end relative">
                <span className="text-indigo-600 font-bold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full text-sm"><Shield size={14}/> 선생님 모드</span>
                
                <div className="relative">
                  <button onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)} className="text-gray-500 hover:text-indigo-600 p-1"><Settings size={18}/></button>
                  {isSettingsMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-50 overflow-hidden animate-fadeIn">
                      <button onClick={() => {setIsSettingsMenuOpen(false); setIsPwChangeModalOpen(true);}} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 font-medium border-b flex items-center gap-2">
                        <Lock size={14}/> 비밀번호 변경
                      </button>
                      <button onClick={() => {setIsSettingsMenuOpen(false); setIsStudentManageModalOpen(true);}} className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 font-medium flex items-center gap-2">
                        <Users size={14}/> 학생 관리
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => { setIsTeacher(false); setInputStudent(""); setIsSettingsMenuOpen(false); }} className="text-gray-500 hover:text-red-600"><LogOut size={18}/></button>
              </div>
            )}
          </div>
        </header>

        {viewMode === 'week' ? renderWeekView() : renderMonthView()}

        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
              <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center justify-center gap-2"><Lock className="text-indigo-600"/> 선생님 로그인</h3>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTeacherLogin()} className="w-full border-2 border-gray-200 p-3 rounded-lg mb-4 focus:outline-none focus:border-indigo-500" placeholder="비밀번호" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setIsLoginModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-lg font-bold">취소</button>
                <button onClick={handleTeacherLogin} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg">로그인</button>
              </div>
            </div>
          </div>
        )}

        {isPwChangeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><Settings size={20}/> 비밀번호 변경</h3>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border p-2 rounded mb-4" placeholder="새 비밀번호 (4자리 이상)" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => {setIsPwChangeModalOpen(false); setNewPassword("");}} className="flex-1 py-2 bg-gray-200 rounded font-bold text-sm">취소</button>
                <button onClick={handleChangePassword} className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold text-sm">변경</button>
              </div>
            </div>
          </div>
        )}

        {isStudentManageModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800"><Users size={20}/> 학생 관리</h3>
                <button onClick={() => setIsStudentManageModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newStudentName} 
                  onChange={(e) => setNewStudentName(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                  className="flex-1 border p-2 rounded focus:border-indigo-500 outline-none" 
                  placeholder="추가할 학생 이름" 
                />
                <button onClick={handleAddStudent} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700">추가</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {students.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">등록된 학생이 없습니다.</p>
                ) : (
                  students.map(s => (
                    <div key={s.id} className="flex justify-between items-center bg-gray-50 p-3 rounded hover:bg-gray-100">
                      <span className="font-medium text-gray-700">{s.name}</span>
                      <button onClick={() => handleDeleteStudent(s.id, s.name)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;