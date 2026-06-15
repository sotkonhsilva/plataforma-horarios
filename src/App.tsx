import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Plus, Settings, RotateCcw, 
  Check, Edit2, Trash2, ChevronLeft, ChevronRight, Briefcase, Coffee,
  AlertCircle, Users, CalendarDays, Map, X, Sliders, Palette
} from 'lucide-react';

// Importa o cliente do Supabase que criaste no passo anterior
import { supabase } from './supabaseClient';

const INITIAL_LOCATIONS = [
  { id: 'loc-1', name: 'Sede', color: 'blue' },
  { id: 'loc-2', name: 'Teletrabalho', color: 'purple' },
  { id: 'loc-3', name: 'Filial Porto', color: 'amber' },
  { id: 'loc-4', name: 'Filial Lisboa', color: 'emerald' },
  { id: 'loc-5', name: 'Cliente', color: 'slate' }
];

const getLocDotClass = (color) => {
  switch (color) {
    case 'blue': return 'bg-blue-500 ring-blue-400';
    case 'purple': return 'bg-purple-500 ring-purple-400';
    case 'amber': return 'bg-amber-500 ring-amber-400';
    case 'emerald': return 'bg-emerald-500 ring-emerald-400';
    case 'rose': return 'bg-rose-500 ring-rose-400';
    case 'indigo': return 'bg-indigo-500 ring-indigo-400';
    default: return 'bg-slate-500 ring-slate-400';
  }
};

const getLocBadgeClass = (color) => {
  switch (color) {
    case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const formatDateLabel = (date) => {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
};

export default function App() {
  // Estados principais alimentados pelo Supabase
  const [collaborators, setCollaborators] = useState([]);
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeColabId, setActiveColabId] = useState('');
  const [viewMode, setViewMode] = useState('weekly');
  const [adminActiveTab, setAdminActiveTab] = useState('colabs');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); 
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  
  // Modais e Formulários
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDayToEdit, setSelectedDayToEdit] = useState(null); 
  const [selectedColabToEdit, setSelectedColabToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ active: true, start: '09:00', end: '18:00', location: 'Sede' });

  const [isColabModalOpen, setIsColabModalOpen] = useState(false);
  const [colabModalMode, setColabModalMode] = useState('add');
  const [selectedColabToForm, setSelectedColabToForm] = useState(null);
  const [colabForm, setColabForm] = useState({ name: '', role: '', email: '', avatar: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [colabToDelete, setColabToDelete] = useState(null);
  const [notification, setNotification] = useState(null);

  // --- CARREGAR DADOS DA BASE DE DADOS (SUPABASE) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Procurar Colaboradores
      const { data: colabsData, error: colabsError } = await supabase
        .from('colaboradores')
        .select('*');
      
      if (colabsError) throw colabsError;
      setCollaborators(colabsData || []);
      
      if (colabsData && colabsData.length > 0 && !activeColabId) {
        setActiveColabId(colabsData[0].id);
      }

      // 2. Procurar Escalas Ativas com dados dos Colaboradores (JOIN)
      const { data: escalasData, error: escalasError } = await supabase
        .from('escalas')
        .select(`
          id, data, hora_entrada, hora_saida, localizacao, colaborador_id,
          colaboradores ( name, role, avatar )
        `);
      
      if (escalasError) throw escalasError;
      setEscalas(escalasData || []);

    } catch (e) {
      showToast("Erro ao carregar dados do banco", "error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getWeekDates = (offset) => {
    const dates = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diffToMonday));
    monday.setDate(monday.getDate() + offset * 7); 

    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      dates.push(nextDay);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeekOffset);
  const activeColab = collaborators.find(c => c.id === activeColabId) || collaborators[0];
  const dayNamesPt = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  // Encontra a escala correspondente filtrando o estado local vindo do Supabase
const getEffectiveScheduleForDay = (colab, date) => {
    if (!colab || !date) return { active: false, start: '09:00', end: '18:00', location: 'Sede' };
    const dateString = date.toISOString().split('T')[0];
    
    const escalaExistente = escalas.find(
      e => e.colaborador_id === colab.id && e.data === dateString
    );

    if (escalaExistente) {
      return {
        active: true,
        start: escalaExistente.hora_entrada.substring(0, 5),
        end: escalaExistente.hora_saida.substring(0, 5), // <-- Garante que diz 'escalaExistente' aqui
        location: escalaExistente.localizacao
      };
    }

    return { active: false, start: '09:00', end: '18:00', location: 'Sede' };
  };

  
  const getLocStyles = (locName) => {
    const loc = locations.find(l => l.name.toLowerCase() === locName.toLowerCase());
    const color = loc ? loc.color : 'slate';
    return { dot: getLocDotClass(color), badge: getLocBadgeClass(color) };
  };

  // --- GRAVAR DADOS NO SUPABASE ---
  const handleSaveCollaboratorForm = async (e) => {
    e.preventDefault();
    if (!colabForm.name || !colabForm.email) {
      showToast("Nome e Email são obrigatórios.", "error");
      return;
    }

    try {
      if (colabModalMode === 'add') {
        const { error } = await supabase
          .from('colaboradores')
          .insert([{ 
            name: colabForm.name, 
            role: colabForm.role || 'Colaborador', 
            email: colabForm.email,
            avatar: colabForm.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`
          }]);
        
        if (error) throw error;
        showToast(`${colabForm.name} adicionado com sucesso!`);
      } else if (colabModalMode === 'edit' && selectedColabToForm) {
        const { error } = await supabase
          .from('colaboradores')
          .update({ name: colabForm.name, role: colabForm.role, email: colabForm.email, avatar: colabForm.avatar })
          .eq('id', selectedColabToForm.id);
        
        if (error) throw error;
        showToast("Cadastro atualizado.");
      }
      setIsColabModalOpen(false);
      fetchData(); // Recarrega os dados atualizados
    } catch (err) {
      showToast("Erro ao guardar no Supabase", "error");
    }
  };

  const handleSaveDayAdjustment = async () => {
    if (!selectedDayToEdit || !selectedColabToEdit) return;
    const dateString = selectedDayToEdit.date.toISOString().split('T')[0];

    try {
      // Verifica se já existe uma escala guardada para este dia/colaborador
      const escalaExistente = escalas.find(e => e.colaborador_id === selectedColabToEdit.id && e.data === dateString);

      if (escalaExistente) {
        // Atualiza a linha existente
        const { error } = await supabase
          .from('escalas')
          .update({
            hora_entrada: editForm.start,
            hora_saida: editForm.end,
            localizacao: editForm.location
          })
          .eq('id', escalaExistente.id);
        if (error) throw error;
      } else {
        // Insere um novo registo
        const { error } = await supabase
          .from('escalas')
          .insert([{
            colaborador_id: selectedColabToEdit.id,
            data: dateString,
            hora_entrada: editForm.start,
            hora_saida: editForm.end,
            localizacao: editForm.location
          }]);
        if (error) throw error;
      }

      showToast("Escala diária atualizada com sucesso.");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      showToast("Erro ao atualizar escala", "error");
    }
  };

  const handleOpenEditDay = (date, colab = activeColab) => {
    if (!colab || !date) return;
    const sched = getEffectiveScheduleForDay(colab, date);
    setSelectedDayToEdit({ date, dayIndex: date.getDay() === 0 ? 6 : date.getDay() - 1 });
    setSelectedColabToEdit(colab);
    setEditForm({
      active: sched.active,
      start: sched.start,
      end: sched.end,
      location: sched.location
    });
    setIsEditModalOpen(true);
  };

  const handleOpenColabModal = (mode, colab = null) => {
    setColabModalMode(mode);
    if (mode === 'edit' && colab) {
      setSelectedColabToForm(colab);
      setColabForm({ name: colab.name, role: colab.role, email: colab.email, avatar: colab.avatar });
    } else {
      setSelectedColabToForm(null);
      setColabForm({ name: '', role: '', email: '', avatar: '' });
    }
    setIsColabModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-500 animate-pulse">A sincronizar com o Supabase...</p>
      </div>
    );
  }

  // --- RENDERIZAÇÃO DA INTERFACE (MANTÉM TODA A TUA ESTRUTURA VISUAL ORIGINÁRIA) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {notification && (
        <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm bg-emerald-50 border-emerald-200 text-emerald-800 transition-all">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl"><CalendarDays className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal de Escalas & Horários</h1>
              <p className="text-xs text-slate-500 font-medium">Parametrização em tempo real ligada à base de dados Supabase.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button onClick={() => setViewMode('weekly')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'weekly' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}><CalendarIcon className="w-3.5 h-3.5 inline mr-1" />Vista Semanal</button>
              <button onClick={() => setViewMode('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Sliders className="w-3.5 h-3.5 inline mr-1" />Painel Admin</button>
            </div>
            <button onClick={() => handleOpenColabModal('add')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs"><Plus className="w-4 h-4 inline mr-1" />Novo Colaborador</button>
          </div>
        </div>
      </header>

      {viewMode === 'weekly' ? (
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <h2 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users className="w-4 h-4" /><span>Membros Ativos ({collaborators.length})</span></h2>
              <div className="space-y-2">
                {collaborators.map((colab) => (
                  <div key={colab.id} onClick={() => setActiveColabId(colab.id)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${activeColabId === colab.id ? 'bg-indigo-50/70 border-indigo-200' : 'border-transparent hover:bg-slate-50'}`}>
                    <img src={colab.avatar} alt={colab.name} className="w-9 h-9 rounded-full object-cover" />
                    <div className="text-left"><h4 className="font-semibold text-slate-900 text-xs">{colab.name}</h4><p className="text-[10px] text-slate-500">{colab.role}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-9 space-y-6">
            {activeColab && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img src={activeColab.avatar} alt={activeColab.name} className="w-14 h-14 rounded-full object-cover" />
                  <div><h2 className="text-lg font-bold text-slate-900">{activeColab.name}</h2><p className="text-xs text-slate-500">{activeColab.email}</p></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {weekDates.map((date, index) => {
                const sched = getEffectiveScheduleForDay(activeColab, date);
                return (
                  <div key={index} onClick={() => handleOpenEditDay(date, activeColab)} className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 cursor-pointer flex flex-col justify-between min-h-[140px]">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">{dayNamesPt[index]}</p>
                      <h3 className="text-base font-black text-slate-900">{formatDateLabel(date)}</h3>
                    </div>
                    <div className="my-2">
                      {sched.active ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-slate-600"><Clock className="w-3 h-3 inline mr-1" />{sched.start} - {sched.end}</div>
                          <div className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${getLocStyles(sched.location).badge}`}>{sched.location}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Folga</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      ) : (
        /* PAINEL ADMINISTRADOR */
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">Gestão de Cadastro de Equipa</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase"><th className="p-4">Colaborador</th><th className="p-4">Cargo</th><th className="p-4">Email</th><th className="p-4 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collaborators.map((colab) => (
                    <tr key={colab.id} className="hover:bg-slate-50/50">
                      <td className="p-4 flex items-center gap-3"><img src={colab.avatar} className="w-10 h-10 rounded-full object-cover" /><span className="font-bold text-slate-950">{colab.name}</span></td>
                      <td className="p-4 font-semibold text-slate-600">{colab.role}</td>
                      <td className="p-4 text-slate-500">{colab.email}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleOpenColabModal('edit', colab)} className="p-2 text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* MODAL: AJUSTAR DIA */}
      {isEditModalOpen && selectedDayToEdit && selectedColabToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black">Escala de {selectedColabToEdit.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Entrada</label>
                  <input type="time" value={editForm.start} onChange={(e) => setEditForm({ ...editForm, start: e.target.value })} className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Saída</label>
                  <input type="time" value={editForm.end} onChange={(e) => setEditForm({ ...editForm, end: e.target.value })} className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Localização</label>
                <select value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full bg-slate-50 border rounded-lg p-1.5 text-xs">
                  {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsEditModalOpen(false)} className="text-xs font-semibold text-slate-500">Cancelar</button>
              <button onClick={handleSaveDayAdjustment} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO/EDITAR COLABORADOR */}
      {isColabModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSaveCollaboratorForm} className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black">{colabModalMode === 'add' ? 'Ficha de Admissão' : 'Editar Perfil'}</h3>
              <button type="button" onClick={() => setIsColabModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" required placeholder="Nome Completo" value={colabForm.name} onChange={(e) => setColabForm({ ...colabForm, name: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 text-xs" />
              <input type="text" placeholder="Cargo" value={colabForm.role} onChange={(e) => setColabForm({ ...colabForm, role: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 text-xs" />
              <input type="email" required placeholder="Email" value={colabForm.email} onChange={(e) => setColabForm({ ...colabForm, email: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsColabModalOpen(false)} className="text-xs font-semibold text-slate-500">Cancelar</button>
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 mt-auto">
        Plataforma Autónoma de Controlo de Escalas • Supabase Cloud Integration.
      </footer>
    </div>
  );
}