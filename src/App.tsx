import React, { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Clock, Edit2, Users, Check, Plus, X, Sliders, ChevronLeft, ChevronRight, LogOut, Trash2, Filter, ChevronDown } from 'lucide-react';
import { supabase } from './supabaseClient';
import logoSrc from './assets/logo.svg';

const dayNamesPt = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const avatarColors = [
  'bg-rose-500/20 text-rose-700 border-rose-500/30 hover:bg-rose-500/30',
  'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/30',
  'bg-sky-500/20 text-sky-700 border-sky-500/30 hover:bg-sky-500/30',
  'bg-violet-500/20 text-violet-700 border-violet-500/30 hover:bg-violet-500/30',
  'bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-500/30 hover:bg-fuchsia-500/30',
  'bg-cyan-500/20 text-cyan-700 border-cyan-500/30 hover:bg-cyan-500/30',
  'bg-lime-500/20 text-lime-700 border-lime-500/30 hover:bg-lime-500/30',
  'bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/30',
];

const getColorForName = (name) => {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month, 1).getDay() - 1; // Ajuste para segunda-feira
  if (day === -1) day = 6;
  return day;
};

// Algoritmo de Gauss para calcular a Páscoa
const getEasterDate = (year) => {
  const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13)/25) + 19 * G + 15) % 30,
        I = H - f(H/28) * (1 - f(29/(H + 1)) * f((21 - G)/11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40)/44),
        day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
};

// Retorna os feriados num formato "MM-DD"
const getPTHolidays = (year) => {
  const easter = getEasterDate(year);
  
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);

  const formatDate = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  return {
    '01-01': 'Ano Novo',
    '04-25': 'Dia da Liberdade',
    '05-01': 'Dia do Trabalhador',
    '06-10': 'Dia de Portugal',
    '08-15': 'Assunção de N. Senhora',
    '10-05': 'Implantação da República',
    '11-01': 'Todos os Santos',
    '12-01': 'Restauração da Independência',
    '12-08': 'Imaculada Conceição',
    '12-25': 'Natal',
    [formatDate(goodFriday)]: 'Sexta-Feira Santa',
    [formatDate(easter)]: 'Páscoa',
    [formatDate(corpusChristi)]: 'Corpo de Deus',
  };
};

const checkHoliday = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  const holidays = getPTHolidays(parseInt(year, 10));
  return holidays[`${month}-${day}`] || null;
};

export default function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para Recuperação de Password
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [collaborators, setCollaborators] = useState([]);
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly', 'admin'
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDayToEdit, setSelectedDayToEdit] = useState(null);
  const [selectedColabToEditId, setSelectedColabToEditId] = useState('');
  const [editForm, setEditForm] = useState([]);

  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [colabModalMode, setColabModalMode] = useState('add');
  const [colabForm, setColabForm] = useState({ 
    id: null, 
    name: '', 
    role: 'Colaborador', 
    email: '', 
    initial_password: '',
    default_shifts: [
      { start_time: '09:00', end_time: '13:00', location: '' },
      { start_time: '14:00', end_time: '20:00', location: '' }
    ] 
  });

  // Filtros da Vista Mensal
  const [colabFilters, setColabFilters] = useState([]);
  const [locFilters, setLocFilters] = useState([]);
  const [isColabFilterOpen, setIsColabFilterOpen] = useState(false);
  const [isLocFilterOpen, setIsLocFilterOpen] = useState(false);

  const [newLocationName, setNewLocationName] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Deteta se o utilizador acabou de voltar de um link de recuperação
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, [session]);

  useEffect(() => {
    if (session && collaborators.length > 0) {
      const me = collaborators.find(c => c.email === session.user.email);
      if (me) {
        setCurrentUserRole(me.role || 'Colaborador');
      }
    }
  }, [session, collaborators]);

  const isAdmin = currentUserRole === 'Administrador' || collaborators.length === 0;

  const fetchData = async () => {
    if (!session) return;
    try {
      const { data: colabsData, error: colabsErr } = await supabase.from('colaboradores').select('*').order('name');
      if (colabsErr) throw colabsErr;
      
      const { data: locsData, error: locsErr } = await supabase.from('localizacoes').select('*').order('name');
      if (locsErr) throw locsErr;
      
      const { data: schedsData, error: schedsErr } = await supabase.from('escalas').select('*');
      if (schedsErr) throw schedsErr;

      setCollaborators(colabsData || []);
      setLocations(locsData || []);
      setSchedules(schedsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showNotification('Erro no Login: ' + error.message, 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('Por favor, preencha o seu email para recuperar.', 'error');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Voltar para a app
    });
    if (error) {
      showNotification('Erro: ' + error.message, 'error');
    } else {
      showNotification('O email com o link de recuperação foi enviado com sucesso! Verifique a sua caixa de entrada.');
      setIsResettingPassword(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotification('A palavra-passe deve ter pelo menos 6 caracteres.', 'error');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showNotification('Erro ao atualizar: ' + error.message, 'error');
    } else {
      showNotification('Palavra-passe atualizada com sucesso! Bem-vindo de volta.');
      setIsRecoveringPassword(false);
    }
  };

  const getEffectiveScheduleForDay = (colab, dateStr) => {
    if (!colab) return [];
    
    // Escalas Manuais (Overrides) aplicam-se SEMPRE que existam, independentemente de ser fds ou feriado
    const overrideShifts = schedules.filter(s => s.colaborador_id === colab.id && s.data === dateStr);
    if (overrideShifts.length > 0) {
      return overrideShifts
        .sort((a, b) => (a.hora_entrada || '').localeCompare(b.hora_entrada || ''))
        .map(s => ({ ...s, isOverride: true, start_time: s.hora_entrada, end_time: s.hora_saida, location: s.localizacao }));
    }
    
    // Se não há escalas manuais, verificamos se o dia permite usar os turnos padrão
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    const isHoliday = !!checkHoliday(dateStr);
    
    // Fim-de-semana ou Feriado = não há horário padrão para ninguém
    if (isWeekend || isHoliday) {
       return [];
    }
    
    // Caso contrário (Dia Útil Normal), retorna a lista de turnos padrão
    if (colab.default_shifts && Array.isArray(colab.default_shifts)) {
       return colab.default_shifts
         .filter(s => s.start_time || s.end_time) // ignora turnos vazios perdidos
         .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
         .map(s => ({ ...s, isOverride: false }));
    }
    
    return [];
  };

  const prevMonth = () => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonthDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonthDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonthDate(d);
  };

  const handleOpenEditDay = (dateStr) => {
    if (!isAdmin) return; 
    setSelectedDayToEdit(dateStr);
    setSelectedColabToEditId('');
    setEditForm([]);
    setIsEditModalOpen(true);
  };

  const handleSelectColabForDay = (colabId) => {
    setSelectedColabToEditId(colabId);
    const colab = collaborators.find(c => c.id === colabId);
    if (!colab) return;
    
    const shifts = getEffectiveScheduleForDay(colab, selectedDayToEdit);
    
    // Se o colaborador não tem turnos hoje (por ser feriado/fds ou dia normal vazio), propõe um bloco padrão de ajuda
    if (shifts.length === 0) {
      setEditForm([{ start_time: '09:00', end_time: '13:00', location: locations[0]?.name || '' }]);
    } else {
      setEditForm(shifts.map(s => ({ start_time: s.start_time, end_time: s.end_time, location: s.location })));
    }
  };

  const handleEditFormChange = (index, field, value) => {
    const newForm = [...editForm];
    newForm[index][field] = value;
    setEditForm(newForm);
  };

  const handleAddShiftToEditForm = () => {
    setEditForm([...editForm, { start_time: '14:00', end_time: '20:00', location: locations[0]?.name || '' }]);
  };

  const handleRemoveShiftFromEditForm = (index) => {
    setEditForm(editForm.filter((_, i) => i !== index));
  };

  const handleSaveDayAdjustment = async () => {
    if (!selectedColabToEditId) return;
    try {
      await supabase.from('escalas').delete()
        .eq('colaborador_id', selectedColabToEditId)
        .eq('data', selectedDayToEdit);
      
      if (editForm.length > 0) {
        const payload = editForm.map(shift => ({
          colaborador_id: selectedColabToEditId,
          data: selectedDayToEdit,
          hora_entrada: shift.start_time || null,
          hora_saida: shift.end_time || null,
          localizacao: shift.location
        }));
        const { error } = await supabase.from('escalas').insert(payload);
        if (error) throw error;
      }

      await fetchData();
      setIsEditModalOpen(false);
      showNotification('Ajuste diário guardado com sucesso!');
    } catch (err) {
      console.error(err);
      showNotification('Erro ao guardar: ' + err.message, 'error');
    }
  };

  const handleClearDayAdjustment = async () => {
     if (!selectedColabToEditId) return;
     try {
       await supabase.from('escalas').delete()
        .eq('colaborador_id', selectedColabToEditId)
        .eq('data', selectedDayToEdit);
       
       await fetchData();
       setIsEditModalOpen(false);
       showNotification('Ajustes removidos! O colaborador regressou aos turnos padrão.');
     } catch (err) {
       showNotification('Erro: ' + err.message, 'error');
     }
  };

  const handleOpenColabModal = (mode, colab = null) => {
    setColabModalMode(mode);
    if (mode === 'edit' && colab) {
      setColabForm({
         ...colab,
         initial_password: '',
         default_shifts: Array.isArray(colab.default_shifts) ? colab.default_shifts : []
      });
    } else {
      setColabForm({ 
        id: null, 
        name: '', 
        role: 'Colaborador', 
        email: '', 
        initial_password: '',
        default_shifts: [
          { start_time: '09:00', end_time: '13:00', location: '' },
          { start_time: '14:00', end_time: '20:00', location: '' }
        ] 
      });
    }
    setIsColabModalOpen(true);
  };

  const handleColabFormShiftChange = (index, field, value) => {
    const newShifts = [...colabForm.default_shifts];
    newShifts[index][field] = value;
    setColabForm({ ...colabForm, default_shifts: newShifts });
  };

  const handleAddDefaultShift = () => {
    setColabForm({
      ...colabForm,
      default_shifts: [...colabForm.default_shifts, { start_time: '', end_time: '', location: '' }]
    });
  };

  const handleRemoveDefaultShift = (index) => {
    setColabForm({
      ...colabForm,
      default_shifts: colabForm.default_shifts.filter((_, i) => i !== index)
    });
  };

  const handleSaveCollaboratorForm = async (e) => {
    e.preventDefault();
    try {
      if (colabModalMode === 'add' && (!colabForm.initial_password || colabForm.initial_password.length < 6)) {
         showNotification('Por favor, defina uma palavra-passe inicial com pelo menos 6 caracteres.', 'error');
         return;
      }

      const payload = { ...colabForm };
      delete payload.id; 
      delete payload.initial_password; // não queremos enviar isto para a tabela de colaboradores
      
      if (colabModalMode === 'edit') {
        const { error } = await supabase.from('colaboradores').update(payload).eq('id', colabForm.id);
        if (error) throw error;
        showNotification('Colaborador atualizado!');
      } else {
        // INSERE NA TABELA PÚBLICA
        const { error } = await supabase.from('colaboradores').insert([payload]);
        if (error) throw error;
        
        // INSERE NA TABELA AUTH (SEM LOGOUT DO ADMIN)
        const { createClient } = await import('@supabase/supabase-js');
        const adminAuthClient = createClient(
           import.meta.env.VITE_SUPABASE_URL,
           import.meta.env.VITE_SUPABASE_ANON_KEY,
           { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        );
        const { error: authError } = await adminAuthClient.auth.signUp({
           email: payload.email,
           password: colabForm.initial_password,
        });
        
        if (authError) {
           console.error("Auth creation warning:", authError);
           showNotification(`Colaborador criado, mas ocorreu um erro no Auth: ${authError.message}`, 'error');
        } else {
           showNotification('Colaborador criado com sucesso! Já se pode autenticar.');
        }
      }
      
      await fetchData();
      setIsColabModalOpen(false);
    } catch (err) {
      console.error(err);
      showNotification('Erro ao gravar: ' + err.message, 'error');
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;
    try {
      const { error } = await supabase.from('localizacoes').insert([{ name: newLocationName }]);
      if (error) throw error;
      setNewLocationName('');
      showNotification('Localização adicionada!');
      fetchData();
    } catch (err) {
      showNotification('Erro: ' + err.message, 'error');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta localização? (Pode quebrar horários que a usem)')) return;
    try {
      const { error } = await supabase.from('localizacoes').delete().eq('id', id);
      if (error) throw error;
      showNotification('Localização eliminada!');
      fetchData();
    } catch (err) {
      showNotification('Erro: ' + err.message, 'error');
    }
  };

  const handleDeleteCollaborator = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este colaborador? (Todos os seus horários serão apagados)')) return;
    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
      showNotification('Colaborador eliminado com sucesso!');
      fetchData();
    } catch (err) {
      showNotification('Erro: ' + err.message, 'error');
    }
  };

  const renderMonthlyGrid = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const blanks = Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} className="bg-slate-800/20 border border-slate-700/50 rounded-xl min-h-[100px]"></div>);
    
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      
      const colabsForDay = collaborators.filter(c => {
        // 1. Filtro de Colaboradores
        if (colabFilters.length > 0 && !colabFilters.includes(c.id)) return false;

        const shifts = getEffectiveScheduleForDay(c, dateStr);
        if (shifts.length === 0) return false;

        // 2. Filtro de Localizações
        if (locFilters.length > 0) {
           const hasMatchingLocation = shifts.some(s => locFilters.includes(s.location));
           if (!hasMatchingLocation) return false;
        }

        return true;
      });
      
      const dateObj = new Date(year, month, i + 1);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const holidayName = checkHoliday(dateStr);
      
      let bgClass = "bg-white";
      if (holidayName) bgClass = "bg-amber-100";
      else if (isWeekend) bgClass = "bg-slate-100";
      
      return (
        <div key={dateStr} onClick={() => isAdmin && handleOpenEditDay(dateStr)} className={`${bgClass} border-2 border-slate-200 rounded-xl p-2 min-h-[120px] flex flex-col transition-all shadow-sm ${isAdmin ? 'hover:border-indigo-400 cursor-pointer hover:shadow-md' : ''}`}>
           <div className="mb-2">
             <span className={`font-bold text-sm opacity-80 ${holidayName ? 'text-amber-800' : 'text-slate-900'}`}>{i + 1}</span>
             {holidayName && <p className="text-[9px] font-bold text-red-600 uppercase leading-tight mt-0.5">{holidayName}</p>}
           </div>
           <div className="flex flex-wrap gap-1 mt-auto">
             {colabsForDay.map(colab => {
               const shifts = getEffectiveScheduleForDay(colab, dateStr);
               const hasOverride = shifts.some(s => s.isOverride);
               return (
                 <div key={colab.id} className="relative group/tooltip">
                   <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center border shadow-sm transition-all ${getColorForName(colab.name)} ${hasOverride ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white' : ''}`}>
                     {getInitials(colab.name)}
                   </div>
                   {/* Tooltip */}
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-slate-900 text-white text-[11px] rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-xl border border-slate-700 pointer-events-none">
                     <p className="font-bold text-indigo-300 mb-2 text-center border-b border-slate-700 pb-1">{colab.name}</p>
                     <div className="space-y-1.5">
                       {shifts.map((s, idx) => (
                         <div key={idx} className="flex flex-col items-center justify-center bg-slate-800/50 p-1.5 rounded">
                           <span className="flex items-center gap-1 font-mono text-slate-200"><Clock className="w-3 h-3 text-indigo-400"/> {s.start_time} - {s.end_time}</span>
                           <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5"><MapPin className="w-3 h-3 text-rose-400"/> {s.location || 'Sem localização'}</span>
                         </div>
                       ))}
                     </div>
                     {hasOverride && <p className="text-[9px] text-yellow-500 mt-2 text-center uppercase font-bold">⚠️ Tem Ajuste Manual</p>}
                     <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700"></div>
                   </div>
                 </div>
               )
             })}
           </div>
        </div>
      );
    });
    
    return [...blanks, ...days];
  };

  if (isAuthLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">A carregar o sistema...</div>;

  // Ecrã de "Nova Password" forçada após clicar no link do email
  if (isRecoveringPassword) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
         {notification && (
          <div className="absolute top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm bg-red-50 text-red-700 border-red-200">
            <span className="font-semibold">{notification.message}</span>
          </div>
         )}
         <img src={logoSrc} alt="Psiporto Logo" className="h-20 object-contain mb-8 drop-shadow-xl" />
         <form onSubmit={handleUpdatePassword} className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
           <h2 className="text-xl font-bold text-white mb-2 text-center">Criar Nova Palavra-Passe</h2>
           <p className="text-xs text-slate-400 text-center mb-6">Por motivos de segurança, escolha uma password forte e única.</p>
           <input type="password" required placeholder="Nova Password (min. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-white mb-6 focus:border-indigo-500 outline-none transition-colors" />
           <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all">Guardar e Entrar</button>
         </form>
      </div>
    );
  }

  // Ecrã de Login Normal e Recuperação de Email
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
         {notification && (
          <div className="absolute top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm bg-red-50 text-red-700 border-red-200">
            <span className="font-semibold">{notification.message}</span>
          </div>
         )}
         <img src={logoSrc} alt="Psiporto Logo" className="h-20 object-contain mb-8 drop-shadow-xl" />
         
         {isResettingPassword ? (
           <form onSubmit={handleForgotPassword} className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
             <h2 className="text-xl font-bold text-white mb-2 text-center">Recuperar Acesso</h2>
             <p className="text-xs text-slate-400 text-center mb-6">Insira o seu email. Vamos enviar-lhe um link seguro para escolher uma nova palavra-passe.</p>
             <input type="email" required placeholder="O seu Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-white mb-6 focus:border-indigo-500 outline-none transition-colors" />
             <div className="flex flex-col gap-3">
               <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all">Enviar Link</button>
               <button type="button" onClick={() => setIsResettingPassword(false)} className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">Voltar ao Login</button>
             </div>
           </form>
         ) : (
           <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
             <h2 className="text-xl font-bold text-white mb-6 text-center">Acesso ao Mapa de Trabalho</h2>
             <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-white mb-4 focus:border-indigo-500 outline-none transition-colors" />
             <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors mb-6" />
             <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all mb-4">Entrar</button>
             <div className="text-center">
               <button type="button" onClick={() => setIsResettingPassword(true)} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Esqueceu-se da palavra-passe?</button>
             </div>
           </form>
         )}
         <p className="text-slate-500 text-xs mt-6 font-medium">Protegido por Psiporto</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col selection:bg-indigo-500/30">
      {notification && (
        <div className={`fixed top-4 right-4 z-[99999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all ${
          notification.type === 'error' 
            ? 'bg-red-50 text-red-700 border-red-200' 
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <Check className="w-4 h-4" />
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center">
              <img src={logoSrc} alt="Psiporto Logo" className="h-12 object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Horários e Localizações</h1>
              <p className="text-xs text-slate-400 font-medium">Parametrização em tempo real.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            
            {/* DROPDOWNS DE FILTRO (Apenas Vista Mensal) */}
            {viewMode === 'monthly' && (
              <div className="flex gap-2 border-r border-slate-700 pr-3 mr-1">
                {/* Filtro Colaboradores */}
                <div className="relative">
                  <button onClick={() => { setIsColabFilterOpen(!isColabFilterOpen); setIsLocFilterOpen(false); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${colabFilters.length > 0 ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-900/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                    <Users className="w-3.5 h-3.5" /> Colaboradores {colabFilters.length > 0 && `(${colabFilters.length})`} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  
                  {isColabFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsColabFilterOpen(false)}></div>
                      <div className="absolute top-full mt-2 right-0 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 flex flex-col max-h-[60vh]">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Colaboradores</span>
                          {colabFilters.length > 0 && <button onClick={() => setColabFilters([])} className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300">Limpar</button>}
                        </div>
                        <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
                          {collaborators.map(c => {
                            const isActive = colabFilters.includes(c.id);
                            return (
                              <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors">
                                <input type="checkbox" checked={isActive} onChange={() => setColabFilters(prev => isActive ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-900" />
                                <span className={`text-xs ${isActive ? 'text-white font-bold' : 'text-slate-300'}`}>{c.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Filtro Localizações */}
                <div className="relative">
                  <button onClick={() => { setIsLocFilterOpen(!isLocFilterOpen); setIsColabFilterOpen(false); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${locFilters.length > 0 ? 'bg-rose-600/20 text-rose-400 border-rose-500/50' : 'bg-slate-900/50 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                    <MapPin className="w-3.5 h-3.5" /> Localizações {locFilters.length > 0 && `(${locFilters.length})`} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                  
                  {isLocFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLocFilterOpen(false)}></div>
                      <div className="absolute top-full mt-2 right-0 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 flex flex-col max-h-[60vh]">
                        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Localizações</span>
                          {locFilters.length > 0 && <button onClick={() => setLocFilters([])} className="text-[10px] text-rose-400 font-bold hover:text-rose-300">Limpar</button>}
                        </div>
                        <div className="overflow-y-auto space-y-1.5 pr-1 flex-1">
                          {locations.map(loc => {
                            const isActive = locFilters.includes(loc.name);
                            return (
                              <label key={loc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors">
                                <input type="checkbox" checked={isActive} onChange={() => setLocFilters(prev => isActive ? prev.filter(n => n !== loc.name) : [...prev, loc.name])} className="rounded border-slate-600 text-rose-500 focus:ring-rose-500 bg-slate-900" />
                                <span className={`text-xs ${isActive ? 'text-white font-bold' : 'text-slate-300'}`}>{loc.name}</span>
                              </label>
                            );
                          })}
                          <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors mt-2 border-t border-slate-700 pt-3">
                            <input type="checkbox" checked={locFilters.includes('')} onChange={() => setLocFilters(prev => prev.includes('') ? prev.filter(n => n !== '') : [...prev, ''])} className="rounded border-slate-600 text-rose-500 focus:ring-rose-500 bg-slate-900" />
                            <span className={`text-xs ${locFilters.includes('') ? 'text-white font-bold' : 'text-slate-300'}`}>Sem Localização</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-900/50 p-1 rounded-xl flex items-center border border-slate-700">
              <button onClick={() => setViewMode('monthly')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}><CalendarDays className="w-3.5 h-3.5 inline mr-1" />Calendário</button>
              {isAdmin && <button onClick={() => setViewMode('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}><Sliders className="w-3.5 h-3.5 inline mr-1" />Administração</button>}
            </div>
            {isAdmin && <button onClick={() => handleOpenColabModal('add')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-900/20 transition-all"><Plus className="w-4 h-4 inline mr-1" />Novo Colaborador</button>}
            <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all" title="Terminar Sessão"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {viewMode === 'monthly' ? (
        /* VISTA MENSAL */
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
           {/* CALENDÁRIO */}
           <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-slate-900/50">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-white text-lg capitalize">{currentMonthDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={nextMonth} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
             </div>
             
             <div className="grid grid-cols-7 gap-3">
               {dayNamesPt.map(d => <div key={d} className="text-center font-bold text-slate-400 text-xs uppercase mb-2">{d.substring(0, 3)}</div>)}
               {renderMonthlyGrid()}
             </div>
           </div>
        </main>
      ) : (
        /* PAINEL ADMINISTRADOR */
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-slate-900/50">
              <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">Gestão de Utilizadores e Acessos</h3>
              <div className="overflow-x-auto border border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 font-bold uppercase"><th className="p-4">Colaborador</th><th className="p-4">Cargo / Nível</th><th className="p-4">Email de Login</th><th className="p-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {collaborators.map((colab) => (
                      <tr key={colab.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 border ${getColorForName(colab.name)}`}>{getInitials(colab.name)}</div><span className="font-bold text-slate-100">{colab.name}</span></td>
                        <td className="p-4 font-semibold text-slate-300">
                          <span className={`px-2 py-1 rounded-md text-[10px] ${colab.role === 'Administrador' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}>{colab.role}</span>
                        </td>
                        <td className="p-4 text-slate-400">{colab.email}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenColabModal('edit', colab)} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteCollaborator(colab.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors ml-1" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {collaborators.length === 0 && (
                      <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nenhum colaborador criado. Clique em "Novo Colaborador" para começar.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-slate-900/50 self-start">
              <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">Gestão de Localizações</h3>
              <form onSubmit={handleAddLocation} className="flex gap-2 mb-4">
                 <input type="text" required placeholder="Nova Localização" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} className="bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 outline-none flex-1" />
                 <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"><Plus className="w-4 h-4" /></button>
              </form>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {locations.map(loc => (
                   <div key={loc.id} className="bg-slate-700/30 border border-slate-600 rounded-lg px-3 py-2.5 flex items-center justify-between text-xs text-white">
                      <span className="font-medium">{loc.name}</span>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                ))}
                {locations.length === 0 && <p className="text-slate-500 text-xs">Nenhuma localização configurada.</p>}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-slate-900/50">
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider mb-4">Blocos de Turnos Padrão</h3>
            <p className="text-xs text-slate-400 mb-4">Esta tabela mostra o número de blocos padrão que cada colaborador tem configurado diariamente.</p>
            <div className="overflow-x-auto border border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 font-bold uppercase"><th className="p-4">Colaborador</th><th className="p-4">Turnos Padrão Configurados</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {collaborators.map((colab) => (
                    <tr key={'def-' + colab.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 font-bold text-slate-100">{colab.name}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {(colab.default_shifts || []).map((s, i) => (
                            <span key={i} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-[10px] font-mono">
                              {s.start_time}-{s.end_time} ({s.location || 'Sem local'})
                            </span>
                          ))}
                          {(!colab.default_shifts || colab.default_shifts.length === 0) && <span className="text-slate-500">Nenhum turno definido</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleOpenColabModal('edit', colab)} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* MODAL: AJUSTAR DIA (NOVO FORMATO MÚLTIPLOS TURNOS) */}
      {isEditModalOpen && selectedDayToEdit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl border border-slate-700 p-6 space-y-4 text-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Gestão de Turnos Diários</p>
                <h3 className="text-sm font-black text-white">{new Date(selectedDayToEdit).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-700/50 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Colaborador a gerir</label>
                <select value={selectedColabToEditId} onChange={(e) => handleSelectColabForDay(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors [&>option]:bg-slate-800">
                  <option value="" disabled>-- Selecione um colaborador --</option>
                  {collaborators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {selectedColabToEditId && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Blocos de Trabalho neste dia</label>
                    <button type="button" onClick={handleAddShiftToEditForm} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Plus className="w-3 h-3"/> Novo Turno</button>
                  </div>

                  {editForm.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 bg-slate-900/30 rounded-xl border border-slate-700/50">Não tem turnos registados neste dia. Está de folga.</p>
                  ) : (
                    editForm.map((shift, index) => (
                      <div key={index} className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 relative group">
                        <button type="button" onClick={() => handleRemoveShiftFromEditForm(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" title="Remover Turno"><X className="w-3 h-3" /></button>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1">Entrada</label>
                            <input type="time" value={shift.start_time} onChange={(e) => handleEditFormChange(index, 'start_time', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1">Saída</label>
                            <input type="time" value={shift.end_time} onChange={(e) => handleEditFormChange(index, 'end_time', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1">Localização</label>
                          <select value={shift.location} onChange={(e) => handleEditFormChange(index, 'location', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 [&>option]:bg-slate-800">
                            <option value="">Sem localização</option>
                            {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-700 mt-4">
              {selectedColabToEditId ? (
                 <button onClick={handleClearDayAdjustment} className="px-3 py-2 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors">Reverter para Padrão</button>
              ) : <div></div>}
              <div className="flex gap-2">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button disabled={!selectedColabToEditId} onClick={handleSaveDayAdjustment} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-900/20 transition-all">Guardar Turnos</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO/EDITAR COLABORADOR & HORÁRIOS PADRÃO (LISTA DINÂMICA) */}
      {isColabModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSaveCollaboratorForm} className="bg-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 text-slate-200 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-sm font-black text-white">{colabModalMode === 'add' ? 'Ficha de Admissão' : 'Editar Perfil & Horários'}</h3>
              <button type="button" onClick={() => setIsColabModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-5">
               <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Informação Pessoal</label>
                 <div className="space-y-3">
                   <input type="text" required placeholder="Nome Completo" value={colabForm.name} onChange={(e) => setColabForm({ ...colabForm, name: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                   <input type="email" required placeholder="Email (Login Supabase)" value={colabForm.email} onChange={(e) => setColabForm({ ...colabForm, email: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                   
                   {colabModalMode === 'add' && (
                     <input type="password" required placeholder="Palavra-Passe Inicial (Mín. 6 caracteres)" value={colabForm.initial_password} onChange={(e) => setColabForm({ ...colabForm, initial_password: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
                   )}
                   
                   <select required value={colabForm.role} onChange={(e) => setColabForm({ ...colabForm, role: e.target.value })} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 transition-colors [&>option]:bg-slate-800">
                     <option value="Colaborador">Colaborador (Visualizador)</option>
                     <option value="Administrador">Administrador (Editor Geral)</option>
                   </select>
                 </div>
               </div>

               <div className="pt-3 border-t border-slate-700">
                 <div className="flex justify-between items-end mb-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase">Blocos de Trabalho Padrão</label>
                   <button type="button" onClick={handleAddDefaultShift} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Plus className="w-3 h-3"/> Novo Bloco</button>
                 </div>

                 {colabForm.default_shifts.length === 0 && <p className="text-xs text-slate-500 text-center bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">Nenhum turno padrão. Trabalha apenas mediante escala manual.</p>}

                 <div className="space-y-3">
                   {colabForm.default_shifts.map((shift, index) => (
                      <div key={index} className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 relative group">
                        <button type="button" onClick={() => handleRemoveDefaultShift(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Remover"><X className="w-3 h-3" /></button>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1">Entrada</label>
                            <input type="time" value={shift.start_time} onChange={(e) => handleColabFormShiftChange(index, 'start_time', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 mb-1">Saída</label>
                            <input type="time" value={shift.end_time} onChange={(e) => handleColabFormShiftChange(index, 'end_time', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1">Localização Base</label>
                          <select value={shift.location} onChange={(e) => handleColabFormShiftChange(index, 'location', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 [&>option]:bg-slate-800">
                            <option value="">Sem localização</option>
                            {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                          </select>
                        </div>
                      </div>
                   ))}
                 </div>
               </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-slate-800 mt-2 border-t border-slate-700 pb-2">
              <button type="button" onClick={() => setIsColabModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-900/20 transition-all">Guardar Perfil</button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-slate-800 border-t border-slate-700 py-4 text-center text-xs text-slate-500 mt-auto font-medium">
        Mapa de Trabalho • Protegido por Psiporto
      </footer>
    </div>
  );
}