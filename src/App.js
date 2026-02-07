import React, { useState, useEffect } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Calendar as CalIcon, List, Lock, LogOut, User, Shield, Settings } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { BrowserRouter } from 'react-router-dom';

const API_BASE = "/api/reservation";

// 시간 범위 (10:00 ~ 23:00)
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

export default function TutoringScheduler() {
  const [userMode, setUserMode] = useState('student');
  const [currentStudent, setCurrentStudent] = useState('');
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPwChangeModalOpen, setIsPwChangeModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [schedule, setSchedule] = useState([]);

  // --- 데이터 불러오기 (DB에서) ---
  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE}/schedules`);
      const data = await res.json();
      // DB 필드명(scheduleDate)과 프론트 변수명(date) 매핑
      const mapped = data.map(s => ({
        id: s.id,
        student: s.studentName,
        date: s.scheduleDate,
        time: s.scheduleTime,
        status: s.status
      }));
      setSchedule(mapped);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // --- 날짜 이동 ---
  const nextDate = () => viewMode === 'week' ? setCurrentDate(addWeeks(currentDate, 1)) : setCurrentDate(addMonths(currentDate, 1));
  const prevDate = () => viewMode === 'week' ? setCurrentDate(subWeeks(currentDate, 1)) : setCurrentDate(subMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  // --- 로그인 & 비밀번호 ---
  const handleTeacherLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput })
      });
      const isSuccess = await res.json();
      if (isSuccess) {
        setUserMode('tutor');
        setIsLoginModalOpen(false);
        setPasswordInput("");
      } else {
        alert("비밀번호가 틀렸습니다.");
      }
    } catch (e) { alert("서버 오류"); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) return alert("4자리 이상 입력하세요.");
    try {
      await fetch(`${API_BASE}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
      });
      alert("변경되었습니다.");
      setIsPwChangeModalOpen(false);
      setNewPassword("");
    } catch (e) { alert("변경 실패"); }
  };

  // --- 스케줄 조작 (API 호출) ---
  const checkStudentName = () => {
    if (userMode === 'student' && !currentStudent) {
      alert("먼저 본인의 이름을 입력해주세요!");
      return false;
    }
    return true;
  };

  const toggleRequest = async (dateStr, time) => {
    if (userMode !== 'student') return;
    if (!checkStudentName()) return;

    const existingSlot = schedule.find(s => s.date === dateStr && s.time === time && s.student === currentStudent);

    if (existingSlot) {
      // 삭제 요청
      await fetch(`${API_BASE}/schedules/${existingSlot.id}`, { method: "DELETE" });
    } else {
      // 생성 요청
      await fetch(`${API_BASE}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: currentStudent,
          scheduleDate: dateStr,
          scheduleTime: time,
          status: 'pending'
        })
      });
    }
    fetchSchedules(); // 목록 갱신
  };

  const handleConfirm = async (id) => {
    await fetch(`${API_BASE}/schedules/${id}/confirm`, { method: "POST" });
    fetchSchedules();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  // --- 뷰 렌더링 헬퍼 (주간) ---
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-8 gap-0 border-t border-l border-gray-300">
        <div className="bg-gray-100 p-2 font-bold text-center border-b border-r border-gray-300 flex items-center justify-center text-sm">Time</div>
        {weekDays.map(day => (
          <div key={day.toString()} className={`p-2 font-bold text-center border-b border-r border-gray-300 text-sm ${isSameDay(day, new Date()) ? 'bg-blue-50 text-blue-600' : 'bg-gray-100'}`}>
            {format(day, 'MM/dd')}<br/>({format(day, 'EEE')})
          </div>
        ))}
        {TIME_SLOTS.map(time => (
          <React.Fragment key={time}>
            <div className="p-2 text-center text-xs text-gray-500 border-b border-r border-gray-300 font-medium bg-gray-50 flex items-center justify-center">{time}</div>
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const slots = schedule.filter(s => s.date === dateStr && s.time === time);
              const mySlot = slots.find(s => s.student === currentStudent);

              return (
                <div key={`${dateStr}-${time}`} onClick={() => userMode === 'student' && toggleRequest(dateStr, time)}
                  className={`relative min-h-[50px] p-1 border-b border-r border-gray-300 transition cursor-pointer flex flex-col gap-1 ${userMode === 'student' ? 'hover:bg-green-50' : 'hover:bg-gray-50'}`}>
                  {userMode === 'student' && (
                    mySlot ? (
                      <div className={`w-full p-1 rounded text-[10px] text-center border ${mySlot.status === 'confirmed' ? 'bg-green-100 border-green-500 text-green-900' : 'bg-yellow-100 border-yellow-400 text-yellow-900'}`}>{mySlot.status === 'confirmed' ? '확정됨' : '대기중'}</div>
                    ) : (
                      <div className="w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-xs text-gray-400 font-bold">+</div>
                    )
                  )}
                  {userMode === 'tutor' && slots.map(slot => (
                    <div key={slot.id} className={`text-[10px] p-1 rounded flex justify-between items-center border shadow-sm ${slot.status === 'confirmed' ? 'bg-white border-blue-500 border-l-4' : getStudentColor(slot.student)}`}>
                      <span className="truncate font-bold max-w-[40px]" title={slot.student}>{slot.student}</span>
                      <div className="flex gap-0.5">
                        {slot.status === 'pending' && <button onClick={(e) => {e.stopPropagation(); handleConfirm(slot.id)}} className="bg-green-500 text-white rounded p-0.5 hover:bg-green-600"><Check size={8} /></button>}
                        <button onClick={(e) => {e.stopPropagation(); handleDelete(slot.id)}} className="bg-red-400 text-white rounded p-0.5 hover:bg-red-500"><X size={8} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // --- 뷰 렌더링 헬퍼 (월간) ---
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDaysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="border border-gray-300">
        <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-300">
          {weekDaysHeader.map((day, idx) => (<div key={day} className={`p-2 text-center font-bold text-sm ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'}`}>{day}</div>))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[minmax(80px,_auto)]">
          {calendarDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, monthStart);
            const daySchedules = schedule.filter(s => s.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
            const displaySchedules = userMode === 'student' ? daySchedules.filter(s => s.student === currentStudent) : daySchedules;
            return (
              <div key={dateStr} className={`p-1 border-r border-b border-gray-300 ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}`}>
                <div className={`text-right text-xs font-bold p-1 ${isSameDay(day, new Date()) ? 'text-blue-600 bg-blue-50 rounded-full inline-block ml-auto' : (!isCurrentMonth ? 'text-gray-300' : 'text-gray-700')}`}>{format(day, 'd')}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {displaySchedules.map(slot => (
                    <div key={slot.id} className={`text-[10px] px-1 py-0.5 rounded flex items-center justify-between border shadow-sm ${slot.status === 'confirmed' ? 'bg-white border-l-2 border-blue-500' : (userMode === 'tutor' ? getStudentColor(slot.student) : 'bg-yellow-100 text-yellow-900 border-yellow-300')}`}>
                      <span className="truncate">{slot.time} {userMode === 'student' ? '내 예약' : slot.student}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded shadow-sm border">
        <div className="flex items-center gap-2">
          <button onClick={prevDate} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronLeft /></button>
          <h2 className="text-lg font-bold min-w-[140px] text-center">{viewMode === 'week' ? `${format(startOfWeek(currentDate, {weekStartsOn:1}), 'M.d')} - ${format(endOfWeek(currentDate, {weekStartsOn:1}), 'M.d')}` : format(currentDate, 'yyyy년 M월')}</h2>
          <button onClick={nextDate} className="p-2 hover:bg-gray-100 rounded-full border"><ChevronRight /></button>
          <button onClick={goToday} className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Today</button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('week')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'week' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><List size={14} /> 주간</button>
          <button onClick={() => setViewMode('month')} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${viewMode === 'month' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><CalIcon size={14} /> 월간</button>
        </div>
        <div className="flex items-center gap-2">
          {userMode === 'student' ? (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <User size={16} className="absolute left-2 text-gray-400" />
                <input type="text" value={currentStudent} onChange={(e) => setCurrentStudent(e.target.value)} className="pl-8 pr-2 py-1.5 border rounded text-sm w-32 focus:outline-none focus:border-indigo-500" placeholder="이름 입력" />
              </div>
              <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 text-xs font-bold" title="선생님 로그인"><Lock size={14} /> 선생님</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"><Shield size={14} /> 선생님 모드</span>
              <button onClick={() => setIsPwChangeModalOpen(true)} className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" title="비밀번호 변경"><Settings size={14}/></button>
              <button onClick={() => { setUserMode('student'); alert('학생 모드로 돌아갑니다.'); }} className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 text-xs font-bold"><LogOut size={14} /> 나가기</button>
            </div>
          )}
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 mb-2">{userMode === 'tutor' ? '💡 체크(V)를 누르면 확정되며 동시간대 대기자는 자동 삭제됩니다.' : currentStudent ? `💡 ${currentStudent}님, 원하는 시간을 클릭하여 신청하세요.` : '💡 이름을 먼저 입력해야 신청할 수 있습니다.'}</div>
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
      
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-900"><Lock size={20}/> 선생님 로그인</h3>
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTeacherLogin()} className="w-full border p-2 rounded mb-4 focus:outline-none focus:border-indigo-500" placeholder="비밀번호" autoFocus />
            <div className="flex gap-2"><button onClick={() => setIsLoginModalOpen(false)} className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">취소</button><button onClick={handleTeacherLogin} className="flex-1 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold text-sm">로그인</button></div>
          </div>
        </div>
      )}
      {isPwChangeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><Settings size={20}/> 비밀번호 변경</h3>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border p-2 rounded mb-4 focus:outline-none focus:border-indigo-500" placeholder="새 비밀번호 (4자리 이상)" autoFocus />
            <div className="flex gap-2"><button onClick={() => {setIsPwChangeModalOpen(false); setNewPassword("");}} className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300 font-bold text-sm">취소</button><button onClick={handleChangePassword} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-sm">변경 저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
}