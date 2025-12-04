import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import {
  Activity, Thermometer, Wrench, AlertTriangle,
  LayoutDashboard, Database, Settings, Search, Filter,
  Download, ChevronDown, ChevronUp, MoreHorizontal,
  RefreshCw, FileText, ArrowUpRight, ArrowDownRight, X,
  Factory, Upload, FileSpreadsheet, DollarSign, Calendar, AlertCircle, Briefcase,
  Lightbulb, CheckCircle2, TrendingUp, Star, ShieldCheck, ShieldAlert, Scale, User, LogOut, Lock, UserPlus, Trash2,
  Plus, Edit, Eye, Printer, Share2, BarChart3, Clock, MapPin, Linkedin, Headphones, Save, XCircle, History, ArrowRightLeft, ArrowRight, RotateCcw
} from 'lucide-react';

// --- FIREBASE IMPORTS (FIRESTORE) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, addDoc, deleteDoc, writeBatch, query, orderBy } from 'firebase/firestore';

// --- CONFIGURAÇÃO E SANITIZAÇÃO DO AMBIENTE ---
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'ecotermo-default';
const appId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Prevenção de crash inicial se config estiver vazia
let app, auth, db;
try {
  if (Object.keys(firebaseConfig).length > 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Erro ao inicializar Firebase:", e);
}

// --- DADOS DE EXEMPLO ---
const generateMockData = (count) => {
  const modelos = ['NT250', 'T15 BFWC', 'NT150', 'S62-BRS10', 'M10M-BASE', 'FRONT-10 RM', 'NX25'];
  const aplicacoes = ['RESFRIADOR DE MOSTO', 'ÁGUA DESAERADA', 'RESFRIADOR DE CERVEJA', 'RESFRIADOR DE ÁGUA', 'AQUECEDOR DE SODA', 'AQUECEDOR AGUA DESAERADA', 'TROCADOR DE CIP SODA', 'TROCADOR LEVEDURA'];
  const areas = ['Processo 01', 'Processo 02', 'Utilidades', 'Adega'];
  
  return Array.from({ length: count }, (_, i) => {
    const modelo = modelos[Math.floor(Math.random() * modelos.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const aplicacao = aplicacoes[Math.floor(Math.random() * aplicacoes.length)];
    const dias = Math.floor(Math.random() * 12) + 1;
    let status = 'operational';
    if (dias > 6) status = 'warning';
    if (dias > 9) status = 'alert';
    const baseEff = 98 - (dias * 2.5); 
    const efficiency = Math.max(40, baseEff + (Math.random() * 5));

    return {
      id: `mock-${Date.now()}-${i}`,
      numero: i + 1,
      modelo: modelo,
      qtdPlacas: Math.floor(Math.random() * 400) + 15,
      aplicacao: aplicacao,
      area: area,
      tagSerial: i % 2 === 0 ? `KVN ${30 + i}/23.044-${i}` : `30.${100 + i}-78.735`,
      dias: dias,
      material: 'OK',
      ultimaManut: new Date(2025, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1).toLocaleDateString('pt-BR'),
      status: status,
      efficiency: parseFloat(efficiency.toFixed(1))
    };
  });
};

const COLORS = {
  primary: '#008200', 
  bgDark: '#002e12',
  chart: { operational: '#008200', warning: '#f59e0b', alert: '#ef4444', stopped: '#94a3b8' }
};

// --- TOAST NOTIFICATION COMPONENT ---
const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    {toasts.map((t) => (
      <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-l-4 transform transition-all duration-300 animate-in slide-in-from-right-10 bg-white ${t.type === 'error' ? 'border-red-500 text-red-800' : 'border-[#008200] text-slate-800'}`}>
        {t.type === 'success' ? <CheckCircle2 size={20} className="text-[#008200]" /> : <AlertCircle size={20} className="text-red-500" />}
        <div>
          <h4 className="font-bold text-sm">{t.title}</h4>
          <p className="text-xs opacity-90">{t.message}</p>
        </div>
        <button onClick={() => removeToast(t.id)} className="ml-2 opacity-50 hover:opacity-100"><X size={14}/></button>
      </div>
    ))}
  </div>
);

// --- COMPONENTES VISUAIS ---
const Badge = ({ status, text, type = 'status' }) => {
  if (type === 'efficiency') {
    const val = parseFloat(text);
    let color = val >= 85 ? 'text-[#008200] bg-emerald-50 border-emerald-200' : 
                val >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${color}`}>{isNaN(val) ? '0.0' : val.toFixed(1)}%</span>;
  }
  let styleClass = "bg-slate-100 text-slate-600 border-slate-200";
  let label = (text !== undefined && text !== null) ? String(text) : "N/A";
  if (status === 'operational') { styleClass = "bg-emerald-50 text-[#008200] border-emerald-200"; label = "OK"; }
  if (status === 'alert') { styleClass = "bg-red-50 text-red-700 border-red-200"; label = "CRÍTICO"; }
  if (status === 'warning') { styleClass = "bg-amber-50 text-amber-700 border-amber-200"; label = "ATENÇÃO"; }
  if (String(text).toUpperCase() === 'OK') { styleClass = "bg-emerald-50 text-[#008200] border-emerald-200"; }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${styleClass} uppercase inline-flex items-center justify-center min-w-[60px]`}>{label}</span>;
};

const KPICard = ({ title, value, subtext, icon: Icon, trend, color, onClick, isActive }) => (
  <div onClick={onClick} className={`bg-white p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${isActive ? 'border-[#008200] ring-1 ring-[#008200] shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1'}`}>
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${color.replace('text-', 'bg-')}`}></div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${color}`}><Icon size={24} strokeWidth={2} /></div>
        {trend && (
          <div className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-[#008200]' : trend === 'down' ? 'text-red-600' : 'text-slate-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={14}/> : trend === 'down' ? <ArrowDownRight size={14}/> : null}
            <span>{trend === 'up' ? '+2.4%' : trend === 'down' ? '-1.2%' : '0%'}</span>
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-slate-800 tracking-tight mb-1">{value}</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
    </div>
  </div>
);

// --- LOGIN ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth) { alert("Erro: Firebase não inicializado."); return; }
    setLoading(true);
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão com o servidor seguro.");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#002e12] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-10 animate-in zoom-in duration-500 relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-[#002e12] rounded-2xl flex items-center justify-center shadow-lg text-white mb-6 transform rotate-3">
           <Star className="fill-red-600 text-red-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">EcoTermo Intelligence</h1>
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-8">{isRegistering ? 'Criar Nova Conta' : 'Acesso Corporativo Seguro'}</p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 ml-1">E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={18} />
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#008200] outline-none transition-all" placeholder="usuario@empresa.com" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#008200] outline-none transition-all" placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#008200] hover:bg-[#006000] text-white p-4 rounded-lg font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 mt-4 uppercase">
            {loading ? <RefreshCw className="animate-spin mx-auto" size={20}/> : (isRegistering ? 'CRIAR CONTA' : 'ENTRAR NO SISTEMA')}
          </button>
        </form>
        <div className="mt-6 w-full text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-slate-500 hover:text-[#008200] font-semibold transition-colors uppercase tracking-wide">
            {isRegistering ? 'Já tem uma conta? Fazer Login' : 'Não tem conta? Criar Conta'}
          </button>
        </div>
        <div className="mt-10 pt-6 border-t border-slate-100 w-full flex justify-between items-center text-[10px] text-slate-400 font-medium">
           <a href="https://www.linkedin.com/in/7icaaro" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#0077b5] transition-colors group">
             <Linkedin size={12} className="text-slate-300 group-hover:text-[#0077b5] transition-colors" /> <span>Developer Icaro</span>
           </a>
           <span className="flex items-center gap-1.5 hover:text-slate-600 cursor-pointer transition-colors"><Headphones size={12} className="text-slate-300" /> Suporte Contatar</span>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function EcoTermoEnterprise() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [assetData, setAssetData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [selectedArea, setSelectedArea] = useState('Todas'); 
  const [selectedAsset, setSelectedAsset] = useState(null); 
  const [toasts, setToasts] = useState([]);
  
  // -- HISTORY STATES --
  const [historyList, setHistoryList] = useState([]);
  const [compareData, setCompareData] = useState(null); 
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const fileInputRef = useRef(null);

  // --- NOTIFICATION HANDLERS ---
  const addToast = (title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- FIRESTORE HELPERS ---
  const getAssetsCollection = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'assets');
  const getHistoryCollection = (uid) => collection(db, 'artifacts', appId, 'users', uid, 'history');

  // --- DATA LOADING & HISTORY ---
  const fetchHistory = async (uid) => {
    if (!uid || !db) return;
    try {
      const snap = await getDocs(getHistoryCollection(uid));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => b.timestamp - a.timestamp);
      setHistoryList(list);
    } catch(e) { console.error("Erro history", e); }
  };

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) {
            console.error("Auth falhou, tentando anônimo como fallback", e);
            await signInAnonymously(auth).catch(err => console.error("Auth anônima falhou", err));
        }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDocs(getAssetsCollection(u.uid));
          if (!snap.empty) {
             const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             setAssetData(list);
          } else {
             const mocks = generateMockData(20);
             setAssetData(mocks);
          }
          await fetchHistory(u.uid); 
        } catch(e) {
          console.error("Erro ao buscar dados", e);
          setAssetData(generateMockData(20));
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- ACTIONS ---
  const handleSaveAsset = async (asset) => {
    if (!user) return;
    try {
      const docRef = doc(getAssetsCollection(user.uid), asset.id);
      await setDoc(docRef, asset);
      setAssetData(prev => prev.map(a => a.id === asset.id ? asset : a));
      setSelectedAsset(null);
      addToast('Sucesso', 'Ativo atualizado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro', 'Falha ao salvar alterações.', 'error');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!user || !window.confirm("Tem certeza que deseja excluir este ativo permanentemente?")) return;
    try {
      await deleteDoc(doc(getAssetsCollection(user.uid), assetId));
      setAssetData(prev => prev.filter(a => a.id !== assetId));
      setSelectedAsset(null);
      addToast('Excluído', 'Ativo removido da base de dados.', 'success');
    } catch (e) {
      console.error(e);
      addToast('Erro', 'Falha ao excluir ativo.', 'error');
    }
  };

  // --- HISTORY ACTIONS ---
  const handleDeleteHistory = async (historyId) => {
    if (!user || !window.confirm("Deseja apagar este backup do histórico?")) return;
    try {
      await deleteDoc(doc(getHistoryCollection(user.uid), historyId));
      setHistoryList(prev => prev.filter(h => h.id !== historyId));
      addToast('Sucesso', 'Backup removido.', 'success');
    } catch (e) {
      addToast('Erro', 'Não foi possível apagar o backup.', 'error');
    }
  };

  // --- RESTAURAÇÃO SEGURA (BATCHING) ---
  const handleRestoreHistory = async (historyItem) => {
    if (!user || !window.confirm(`ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos dados do backup de ${historyItem.date}. Deseja continuar?`)) return;
    
    try {
      setLoading(true);
      const chunkSize = 400; 
      const currentSnap = await getDocs(getAssetsCollection(user.uid));
      
      let batch = writeBatch(db);
      let counter = 0;
      const batches = [];

      currentSnap.forEach((doc) => {
        batch.delete(doc.ref);
        counter++;
        if (counter >= chunkSize) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          counter = 0;
        }
      });
      if (counter > 0) batches.push(batch.commit());
      await Promise.all(batches);
      
      const restoredData = historyItem.data || [];
      batch = writeBatch(db);
      counter = 0;
      const insertBatches = [];

      restoredData.forEach((item) => {
        const newRef = doc(getAssetsCollection(user.uid)); 
        batch.set(newRef, { ...item, id: newRef.id });
        counter++;
        if (counter >= chunkSize) {
          insertBatches.push(batch.commit());
          batch = writeBatch(db);
          counter = 0;
        }
      });
      if (counter > 0) insertBatches.push(batch.commit());

      await Promise.all(insertBatches);
      
      const newSnap = await getDocs(getAssetsCollection(user.uid));
      const list = newSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssetData(list);
      
      addToast('Restaurado', 'Sistema revertido com sucesso.', 'success');
      setActiveView('dashboard');
    } catch (e) {
      console.error("Restore error:", e);
      addToast('Erro', 'Falha crítica ao restaurar backup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = (historyItem) => {
    setCompareData({
      date: historyItem.date,
      oldData: historyItem.data || [],
      currentData: assetData
    });
  };

  const closeCompare = () => {
    setCompareData(null);
    setOnlyDifferences(false);
  };

  // --- FILTROS E CÁLCULOS ---
  const uniqueAreas = useMemo(() => {
    const areas = assetData.map(d => d.area).filter(Boolean);
    return ['Todas', ...new Set(areas)].sort();
  }, [assetData]);

  const areaData = useMemo(() => {
    if (selectedArea === 'Todas') return assetData;
    return assetData.filter(d => d.area === selectedArea);
  }, [assetData, selectedArea]);

  const filteredData = useMemo(() => {
    if (activeFilter === 'all') return areaData;
    return areaData.filter(d => d.status === activeFilter);
  }, [areaData, activeFilter]);

  const stats = useMemo(() => {
    const total = areaData.length;
    const critical = areaData.filter(d => d.status === 'alert').length;
    const warning = areaData.filter(d => d.status === 'warning').length;
    const operational = areaData.filter(d => d.status === 'operational').length;
    
    let sumEff = 0, countEff = 0;
    areaData.forEach(d => {
      const effVal = parseFloat(d.efficiency);
      if (!isNaN(effVal)) { sumEff += effVal; countEff++; }
    });
    const avgEff = countEff > 0 ? (sumEff / countEff).toFixed(1) : 0;
    
    const groupBy = selectedArea === 'Todas' ? 'area' : 'tagSerial';
    const grouping = {};
    areaData.forEach(d => {
       const keySource = selectedArea === 'Todas' ? (d.area || 'Indefinido') : (d.tagSerial || 'S/N');
       const key = String(keySource).split('/')[0]; 
       if (!grouping[key]) grouping[key] = { name: key, efficiency: 0, days: 0, count: 0 };
       
       const effVal = parseFloat(d.efficiency);
       const daysVal = parseFloat(d.dias);
       
       grouping[key].efficiency += (isNaN(effVal) ? 0 : effVal);
       grouping[key].days += (isNaN(daysVal) ? 0 : daysVal);
       grouping[key].count++;
    });
    
    const advancedChartData = Object.values(grouping).map(a => ({
      name: a.name,
      eficiencia: a.count > 0 ? parseFloat((a.efficiency/a.count).toFixed(1)) : 0,
      dias: a.count > 0 ? parseFloat((a.days/a.count).toFixed(1)) : 0
    })).sort((a,b) => a.eficiencia - b.eficiencia);

    const pieData = [
      { name: 'Operacional', value: operational, color: COLORS.chart.operational },
      { name: 'Atenção', value: warning, color: COLORS.chart.warning },
      { name: 'Crítico', value: critical, color: COLORS.chart.alert }
    ].filter(d => d.value > 0);

    return { total, critical, warning, operational, avgEff, advancedChartData, pieData };
  }, [areaData, selectedArea]);

  // --- UPLOAD LOGIC ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) { addToast("Aviso", "Arquivo vazio ou inválido.", "error"); return; }
      
      if (!user) return;

      try {
        setLoading(true);
        
        // 1. Backup
        if (assetData.length > 0) {
            const timestamp = Date.now();
            await addDoc(getHistoryCollection(user.uid), {
            timestamp,
            date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'),
            user: user.isAnonymous ? 'Admin (Auto)' : user.email,
            totalAssets: assetData.length,
            data: assetData 
            });
            await fetchHistory(user.uid); 
            addToast('Backup', 'Versão anterior salva no histórico.', 'success');
        }

        // 2. Parser
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
        
        const idx = {
            numero: headers.findIndex(h => h.includes('n') || h.includes('no') || h.includes('num')),
            modelo: headers.findIndex(h => h.includes('modelo')),
            qtdPlacas: headers.findIndex(h => h.includes('placas')),
            aplicacao: headers.findIndex(h => h.includes('aplicacao')),
            area: headers.findIndex(h => h.includes('area')),
            tagSerial: headers.findIndex(h => h.includes('tag') || h.includes('serie')),
            dias: headers.findIndex(h => h.includes('dias')),
            material: headers.findIndex(h => h.includes('material')),
            ultimaManut: headers.findIndex(h => h.includes('ultima')),
            efficiency: headers.findIndex(h => h.includes('eficiencia') || h.includes('eficiência'))
        };

        const itemsToAdd = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(separator);
            if (cols.length < 2) continue;
            
            const rawDias = idx.dias > -1 ? parseInt(cols[idx.dias]) : 0;
            const dias = isNaN(rawDias) ? 0 : rawDias;
            let status = 'operational';
            if (dias > 6) status = 'warning';
            if (dias > 8) status = 'alert';

            let efficiency = status === 'operational' ? 95 : status === 'warning' ? 80 : 60;
            if (idx.efficiency > -1 && cols[idx.efficiency]) {
                const parsedEff = parseFloat(cols[idx.efficiency].replace(',', '.').replace('%', ''));
                if (!isNaN(parsedEff)) efficiency = parsedEff;
            }

            itemsToAdd.push({
                numero: idx.numero > -1 ? (cols[idx.numero]?.trim() || i) : i,
                modelo: idx.modelo > -1 ? (cols[idx.modelo]?.trim() || '-') : '-',
                qtdPlacas: idx.qtdPlacas > -1 ? (cols[idx.qtdPlacas]?.trim() || '0') : '0',
                aplicacao: idx.aplicacao > -1 ? (cols[idx.aplicacao]?.trim() || 'Geral') : 'Geral',
                area: idx.area > -1 ? (cols[idx.area]?.trim() || 'Indefinida') : 'Indefinida',
                tagSerial: idx.tagSerial > -1 ? (cols[idx.tagSerial]?.trim() || '-') : '-',
                dias: dias,
                material: idx.material > -1 ? (cols[idx.material]?.trim() || 'OK') : 'OK',
                ultimaManut: idx.ultimaManut > -1 ? (cols[idx.ultimaManut]?.trim() || '-') : '-',
                status: status,
                efficiency: efficiency,
                importedAt: new Date().toISOString()
            });
        }

        // 3. Batch Write
        const chunkSize = 400;
        const currentSnap = await getDocs(getAssetsCollection(user.uid));
        let batch = writeBatch(db);
        let counter = 0;
        const batches = [];

        currentSnap.forEach((doc) => {
            batch.delete(doc.ref);
            counter++;
            if (counter >= chunkSize) {
            batches.push(batch.commit());
            batch = writeBatch(db);
            counter = 0;
            }
        });
        if (counter > 0) batches.push(batch.commit());
        await Promise.all(batches);

        batch = writeBatch(db);
        counter = 0;
        const insertBatches = [];
        const newData = [];

        itemsToAdd.forEach(item => {
            const newRef = doc(getAssetsCollection(user.uid));
            const itemWithId = { ...item, id: newRef.id };
            batch.set(newRef, itemWithId);
            newData.push(itemWithId);
            counter++;
            if (counter >= chunkSize) {
                insertBatches.push(batch.commit());
                batch = writeBatch(db);
                counter = 0;
            }
        });
        if (counter > 0) insertBatches.push(batch.commit());
        await Promise.all(insertBatches);

        setAssetData(newData);
        addToast('Importação', 'Novos dados carregados com sucesso!', 'success');

      } catch (e) {
          console.error(e);
          addToast("Erro", "Falha na importação da planilha.", "error");
      } finally {
          setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-[#008200]"><RefreshCw className="animate-spin" /></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <aside className="w-20 lg:w-72 bg-[#002e12] text-white flex flex-col shadow-2xl z-30 transition-all duration-300">
        <div className="h-24 flex items-center px-6 border-b border-white/10 gap-4 bg-[#00250e]">
          <div className="bg-white p-2 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-pointer">
            <Star className="text-red-600 fill-red-600" size={24} />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-lg leading-tight">EcoTermo</h1>
            <span className="text-[10px] text-emerald-400 font-bold tracking-[0.2em] uppercase">Enterprise V2.0</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Executivo' },
            { id: 'assets', icon: Database, label: 'Base de Dados' },
            { id: 'history', icon: History, label: 'Histórico & Backup' }, 
            { id: 'reports', icon: FileText, label: 'Relatórios Oficiais' },
          ].map(i => (
            <button key={i.id} onClick={() => setActiveView(i.id)} 
              className={`w-full flex items-center p-4 rounded-xl transition-all duration-200 group ${activeView === i.id ? 'bg-[#008200] text-white shadow-lg shadow-emerald-900/50 translate-x-1' : 'text-emerald-100/60 hover:bg-white/5 hover:text-white'}`}
            >
              <i.icon size={22} className={`mr-0 lg:mr-3 transition-transform ${activeView === i.id ? 'scale-110' : 'group-hover:scale-110'}`} /> 
              <span className="text-sm font-bold hidden lg:block tracking-wide">{i.label}</span>
              {activeView === i.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white hidden lg:block"></div>}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/10 bg-black/20">
           <div className="flex items-center gap-3 mb-6 hidden lg:flex">
             <div className="w-10 h-10 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-xs font-bold text-emerald-100">
                {(user.email || 'AD').substring(0,2).toUpperCase()}
             </div>
             <div className="overflow-hidden">
               <p className="text-xs font-bold text-white truncate">{user.email || 'Admin'}</p>
               <p className="text-[10px] text-emerald-400 uppercase">Administrador</p>
             </div>
           </div>
           <button onClick={() => fileInputRef.current.click()} className="w-full bg-white/10 border border-white/10 text-white py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:text-[#002e12] transition-all mb-3 group">
             <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" /> <span className="hidden lg:block">Importar CSV</span>
           </button>
           <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs font-bold py-3 rounded-lg transition-colors">
             <LogOut size={16}/> <span className="hidden lg:block">Sair</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-20">
           <div>
             <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
               {activeView === 'dashboard' ? <LayoutDashboard size={20} className="text-[#008200]"/> : activeView === 'history' ? <History size={20} className="text-[#008200]"/> : activeView === 'reports' ? <FileText size={20} className="text-[#008200]"/> : <Database size={20} className="text-[#008200]"/>}
               {activeView === 'dashboard' ? 'Painel de Controle' : activeView === 'history' ? 'Histórico de Versões' : activeView === 'reports' ? 'Relatórios Food Safety' : 'Inventário de Ativos'}
             </h2>
             <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               Dados sincronizados em tempo real
             </p>
           </div>
           
           <div className="flex items-center gap-4">
             {activeView === 'dashboard' && (
               <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                 <MapPin size={16} className="text-[#008200]" />
                 <span className="text-xs text-slate-500 font-bold uppercase mr-1">Área:</span>
                 <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer hover:text-[#008200] transition-colors">
                   {uniqueAreas.map(area => (<option key={area} value={area}>{area}</option>))}
                 </select>
               </div>
             )}
             <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 hidden md:flex">
               <Clock size={16} className="text-slate-400"/>
               <span className="text-xs font-bold text-slate-600 font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-8 scroll-smooth">
          
          {activeView === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title={selectedArea === 'Todas' ? "Total Planta" : `Total ${selectedArea}`} value={stats.total} subtext="Ativos Monitorados" icon={Database} trend="neutral" color="text-blue-600" onClick={() => setActiveFilter('all')} isActive={activeFilter === 'all'}/>
                <KPICard title="Conformidade" value={`${stats.operational}`} subtext="Equipamentos OK" icon={ShieldCheck} trend="up" color="text-[#008200]" onClick={() => setActiveFilter('operational')} isActive={activeFilter === 'operational'}/>
                <KPICard title="Pontos Críticos" value={stats.critical} subtext="Dias > 8 (Ação Imediata)" icon={AlertTriangle} trend={stats.critical > 0 ? 'down' : 'neutral'} color="text-red-600" onClick={() => setActiveFilter('alert')} isActive={activeFilter === 'alert'}/>
                <KPICard title="Em Atenção" value={stats.warning} subtext="Dias > 6 (Planejar)" icon={Activity} trend="neutral" color="text-amber-500" onClick={() => setActiveFilter('warning')} isActive={activeFilter === 'warning'}/>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex justify-between items-center mb-6">
                     <div>
                       <h3 className="font-bold text-slate-800 text-lg">Performance: {selectedArea}</h3>
                       <p className="text-xs text-slate-500">{selectedArea === 'Todas' ? 'Média de Eficiência por Área' : 'Análise individual de Eficiência vs Dias Operados'}</p>
                     </div>
                     <div className="flex gap-2">
                       <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#008200]"><span className="w-2 h-2 rounded-full bg-[#008200]"></span> Eficiência</span>
                       <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Dias Oper.</span>
                     </div>
                   </div>
                   <div className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                       <ComposedChart data={stats.advancedChartData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} dy={10} interval={0} />
                         <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} domain={[0, 100]} unit="%" />
                         <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} unit="d" />
                         <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} cursor={{fill: '#f8fafc'}}/>
                         <Bar yAxisId="left" dataKey="eficiencia" fill="#008200" radius={[4, 4, 0, 0]} barSize={selectedArea === 'Todas' ? 40 : 20} fillOpacity={0.9} />
                         <Line yAxisId="right" type="monotone" dataKey="dias" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} />
                       </ComposedChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                   <h3 className="font-bold text-slate-800 text-lg mb-2">Status: {selectedArea}</h3>
                   <p className="text-xs text-slate-500 mb-6">Distribuição atual dos status dos ativos.</p>
                   <div className="flex-1 min-h-[250px] relative">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                           {stats.pieData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                         </Pie>
                         <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                         <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                       </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none -mt-4">
                        <span className="block text-4xl font-bold text-slate-800">{stats.total}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ativos</span>
                     </div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activeFilter === 'alert' ? 'bg-red-500' : activeFilter === 'warning' ? 'bg-amber-500' : 'bg-[#008200]'}`}></div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                      {activeFilter === 'all' ? `Visão Geral (${selectedArea})` : activeFilter === 'alert' ? 'Equipamentos Críticos' : activeFilter === 'warning' ? 'Equipamentos em Atenção' : 'Equipamentos Operacionais'}
                    </h3>
                  </div>
                  <button onClick={() => setActiveView('assets')} className="text-xs font-bold text-[#008200] hover:underline uppercase">Ver Tabela Completa</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-6 py-3">Tag</th>
                        <th className="px-6 py-3">Área</th>
                        <th className="px-6 py-3">Modelo</th>
                        <th className="px-6 py-3 text-center">Dias (10h)</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-center">Eficiência</th>
                        <th className="px-6 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredData.slice(0, 5).map((row, i) => (
                        <tr key={`dash-row-${i}`} className="hover:bg-slate-50 transition-colors cursor-default">
                          <td className="px-6 py-4 font-bold text-slate-700">{row.tagSerial}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{row.area}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs font-mono">{row.modelo}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{row.dias}</td>
                          <td className="px-6 py-4 text-center"><Badge status={row.status} /></td>
                          <td className="px-6 py-4 text-center"><Badge type="efficiency" text={row.efficiency} /></td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => setSelectedAsset(row)} className="p-1.5 text-slate-400 hover:text-[#008200] hover:bg-emerald-50 rounded transition-colors"><Eye size={16}/></button>
                          </td>
                        </tr>
                      ))}
                      {filteredData.length === 0 && (
                        <tr><td colSpan="7" className="p-8 text-center text-slate-400">Nenhum registro encontrado para este filtro.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeView === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Histórico de Versões</h2>
                  <p className="text-slate-500 text-sm">Snapshots automáticos gerados a cada nova importação.</p>
                </div>
              </div>

              {historyList.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
                  <History size={48} className="mx-auto text-slate-300 mb-4"/>
                  <p className="text-slate-500 font-medium">Nenhum histórico encontrado.</p>
                  <p className="text-xs text-slate-400 mt-1">O histórico será criado automaticamente quando você importar novos dados.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {historyList.map(hist => (
                    <div key={hist.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-3 rounded-full text-slate-500 group-hover:bg-emerald-50 group-hover:text-[#008200] transition-colors"><History size={24}/></div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">Backup: {hist.date}</h4>
                          <p className="text-xs text-slate-500 mt-1">Importado por: <span className="font-medium text-slate-700">{hist.user}</span></p>
                          <div className="flex gap-3 mt-2">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{hist.totalAssets} Ativos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* BOTÃO RESTAURAR */}
                        <button onClick={() => handleRestoreHistory(hist)} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#008200] text-[#008200] text-xs font-bold rounded-lg hover:bg-emerald-50 transition-colors" title="Restaurar esta versão">
                          <RotateCcw size={16}/> Restaurar
                        </button>
                        
                        <button onClick={() => handleCompare(hist)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                          <ArrowRightLeft size={16}/> Comparar
                        </button>

                        {/* BOTÃO EXCLUIR */}
                        <button onClick={() => handleDeleteHistory(hist.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2" title="Apagar Backup">
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'reports' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
               <div className="w-full max-w-[210mm] bg-white shadow-2xl min-h-[297mm] p-12 relative print:shadow-none print:w-full print:p-0">
                  <div className="flex justify-between items-start border-b-2 border-[#002e12] pb-6 mb-8">
                     <div>
                       <h1 className="text-3xl font-bold text-[#002e12] uppercase tracking-tight">Relatório Técnico</h1>
                       <p className="text-slate-500 mt-1 font-medium">Controle de Trocadores de Calor & Food Safety</p>
                     </div>
                     <div className="text-right">
                       <div className="text-2xl font-bold text-[#008200] tracking-tighter mb-1">EcoTermo</div>
                       <p className="text-xs text-slate-400 font-mono">EMISSÃO: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                       <p className="text-xs text-slate-400 font-mono">RESP: {user.email || 'Admin'}</p>
                     </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-6 mb-8 border border-slate-100">
                    <h4 className="text-sm font-bold text-[#002e12] uppercase mb-4 border-b border-slate-200 pb-2">Resumo Executivo</h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                       <div><span className="block text-3xl font-bold text-slate-800">{stats.total}</span><span className="text-[10px] uppercase font-bold text-slate-400">Ativos Totais</span></div>
                       <div><span className={`block text-3xl font-bold ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</span><span className="text-[10px] uppercase font-bold text-slate-400">Pontos Críticos</span></div>
                       <div><span className="block text-3xl font-bold text-[#008200]">100%</span><span className="text-[10px] uppercase font-bold text-slate-400">Material OK</span></div>
                       <div><span className="block text-3xl font-bold text-blue-600">{stats.avgEff}%</span><span className="text-[10px] uppercase font-bold text-slate-400">Eficiência Média</span></div>
                    </div>
                  </div>
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-[#002e12] uppercase mb-4 border-b border-slate-200 pb-2">Detalhamento Técnico</h4>
                    <table className="w-full text-xs text-left border-collapse border border-slate-300">
                      <thead className="bg-[#002e12] text-white font-bold uppercase">
                        <tr>
                          <th className="p-2 border border-slate-400 text-center w-10">N°</th>
                          <th className="p-2 border border-slate-400">Modelo</th>
                          <th className="p-2 border border-slate-400 text-center">Placas</th>
                          <th className="p-2 border border-slate-400">Aplicação</th>
                          <th className="p-2 border border-slate-400">Tag / Série</th>
                          <th className="p-2 border border-slate-400 text-center">Dias</th>
                          <th className="p-2 border border-slate-400 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetData.map((d, i) => (
                          <tr key={`rep-full-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-2 border border-slate-300 text-center font-bold">{d.numero}</td>
                            <td className="p-2 border border-slate-300">{d.modelo}</td>
                            <td className="p-2 border border-slate-300 text-center">{d.qtdPlacas}</td>
                            <td className="p-2 border border-slate-300">{d.aplicacao}</td>
                            <td className="p-2 border border-slate-300 font-mono text-[10px]">{d.tagSerial}</td>
                            <td className={`p-2 border border-slate-300 text-center font-bold ${d.dias > 8 ? 'text-red-600 bg-red-50' : ''}`}>{d.dias}</td>
                            <td className="p-2 border border-slate-300 text-center text-[10px] font-bold uppercase text-[#008200]">OK</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
               <div className="mt-8 mb-12 flex gap-4 print:hidden">
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#002e12] text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-[#00451b] transition-transform hover:-translate-y-1">
                   <Printer size={20} /> IMPRIMIR PDF OFICIAL
                 </button>
               </div>
            </div>
          )}

          {activeView === 'assets' && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500 flex flex-col h-full min-h-[600px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                   <div>
                     <h3 className="font-bold text-slate-800 text-lg">Base de Dados Mestra</h3>
                     <p className="text-xs text-slate-500">Gestão completa de todos os ativos cadastrados.</p>
                   </div>
                   <div className="flex gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input type="text" placeholder="Filtrar por TAG..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#008200] outline-none w-64"/>
                      </div>
                      <span className="bg-[#008200] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center">{assetData.length} Registros</span>
                   </div>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-4 border-b border-slate-200 text-center w-16">N°</th>
                        <th className="p-4 border-b border-slate-200">Modelo</th>
                        <th className="p-4 border-b border-slate-200 text-center">Placas</th>
                        <th className="p-4 border-b border-slate-200">Aplicação</th>
                        <th className="p-4 border-b border-slate-200">Área</th>
                        <th className="p-4 border-b border-slate-200">TAG / Série</th>
                        <th className="p-4 border-b border-slate-200 text-center">Dias (10h)</th>
                        <th className="p-4 border-b border-slate-200 text-center">Material</th>
                        <th className="p-4 border-b border-slate-200 text-center">Última Manut.</th>
                        <th className="p-4 border-b border-slate-200 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assetData.map((d, i) => (
                        <tr key={`db-row-${i}`} onClick={() => setSelectedAsset(d)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 text-center font-bold text-slate-700">{d.numero}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 font-medium text-slate-600">{d.modelo}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 text-center font-mono text-slate-500">{d.qtdPlacas}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 font-medium text-slate-700">{d.aplicacao}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 text-slate-500 italic">{d.area}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 font-mono text-xs text-[#008200] font-bold">{d.tagSerial}</td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 text-center"><span className={`px-2 py-1 rounded ${d.dias > 8 ? 'bg-red-100 text-red-700 font-bold' : 'text-slate-700'}`}>{d.dias}</span></td>
                          <td className="p-4 border-r border-slate-50 group-hover:border-slate-100 text-center"><Badge status="operational" text={d.material} /></td>
                          <td className="p-4 text-center text-slate-500">{d.ultimaManut}</td>
                          <td className="p-4 text-center">
                            <button className="text-slate-400 hover:text-[#008200] p-1"><Edit size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* ASSET DETAILS / EDIT SLIDEOVER */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAsset(null)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Detalhes do Ativo</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAsset.tagSerial}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex items-center gap-4">
                <div className="p-3 bg-white rounded-full text-[#008200] shadow-sm"><Activity size={24}/></div>
                <div>
                  <p className="text-xs font-bold text-emerald-800 uppercase">Status Atual</p>
                  <p className="text-lg font-bold text-[#008200]">{selectedAsset.dias > 8 ? 'CRÍTICO' : selectedAsset.dias > 6 ? 'ATENÇÃO' : 'OPERACIONAL'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">Dados Técnicos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                    <input className="w-full border border-slate-200 rounded p-2 text-sm font-medium" value={selectedAsset.modelo} onChange={(e) => setSelectedAsset({...selectedAsset, modelo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Placas</label>
                    <input className="w-full border border-slate-200 rounded p-2 text-sm font-medium" type="number" value={selectedAsset.qtdPlacas} onChange={(e) => setSelectedAsset({...selectedAsset, qtdPlacas: e.target.value})} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Aplicação</label>
                    <input className="w-full border border-slate-200 rounded p-2 text-sm font-medium" value={selectedAsset.aplicacao} onChange={(e) => setSelectedAsset({...selectedAsset, aplicacao: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Área</label>
                    <input className="w-full border border-slate-200 rounded p-2 text-sm font-medium" value={selectedAsset.area} onChange={(e) => setSelectedAsset({...selectedAsset, area: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Dias (10h)</label>
                    <input className="w-full border border-slate-200 rounded p-2 text-sm font-medium" type="number" value={selectedAsset.dias} onChange={(e) => setSelectedAsset({...selectedAsset, dias: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => handleDeleteAsset(selectedAsset.id)} className="flex-1 bg-white border border-red-200 text-red-600 py-3 rounded-lg font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2 transition-colors">
                <Trash2 size={18}/> Excluir
              </button>
              <button onClick={() => handleSaveAsset(selectedAsset)} className="flex-[2] bg-[#008200] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#006000] shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 transition-colors">
                <Save size={18}/> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARE MODAL - COMPARAÇÃO LADO A LADO APRIMORADA */}
      {compareData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="text-[#008200]"/> Comparativo de Versões
                </h3>
                <p className="text-sm text-slate-500 mt-1">Comparando <strong>Atual</strong> com Backup de <strong>{compareData.date}</strong></p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-600 font-bold cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={onlyDifferences} 
                    onChange={(e) => setOnlyDifferences(e.target.checked)}
                    className="w-4 h-4 text-[#008200] rounded focus:ring-[#008200]"
                  />
                  Apenas Diferenças
                </label>
                <button onClick={closeCompare} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-1/3">Equipamento (Tag / Série)</th>
                      <th className="p-4 text-center w-1/4 bg-slate-50">Versão Anterior</th>
                      <th className="p-4 text-center w-1/12"><ArrowRight size={14} className="mx-auto text-slate-300"/></th>
                      <th className="p-4 text-center w-1/4 bg-slate-50">Versão Atual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {compareData.currentData
                      .filter(curr => {
                        if (!onlyDifferences) return true;
                        const old = compareData.oldData.find(o => o.tagSerial === curr.tagSerial) || {};
                        return curr.dias !== old.dias;
                      })
                      .map((curr, i) => {
                        const old = compareData.oldData.find(o => o.tagSerial === curr.tagSerial) || {};
                        const diffDias = (curr.dias || 0) - (old.dias || 0);
                        const hasChange = diffDias !== 0;

                        return (
                          <tr key={`comp-${i}`} className={`hover:bg-slate-50 transition-colors ${hasChange ? 'bg-amber-50/30' : ''}`}>
                            <td className="p-4">
                              <div className="font-bold text-slate-700">{curr.tagSerial}</div>
                              <div className="text-[10px] text-slate-400">{curr.modelo} • {curr.area}</div>
                            </td>
                            
                            {/* COLUNA ANTERIOR */}
                            <td className="p-4 text-center border-r border-slate-50">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-slate-500 font-mono text-sm">
                                  {old.dias !== undefined ? `${old.dias} dias` : '-'}
                                </span>
                              </div>
                            </td>

                            {/* SETA INDICATIVA */}
                            <td className="p-4 text-center">
                              {hasChange ? (
                                diffDias > 0 
                                  ? <ArrowUpRight size={16} className="mx-auto text-red-500" />
                                  : <ArrowDownRight size={16} className="mx-auto text-[#008200]" />
                              ) : (
                                <span className="text-slate-200 mx-auto text-center block">—</span>
                              )}
                            </td>

                            {/* COLUNA ATUAL */}
                            <td className="p-4 text-center border-l border-slate-50">
                              <div className="flex flex-col items-center justify-center">
                                <span className={`font-bold text-sm ${
                                  hasChange 
                                    ? (diffDias > 0 ? 'text-red-600' : 'text-[#008200]') 
                                    : 'text-slate-700'
                                }`}>
                                  {curr.dias} dias
                                </span>
                                {hasChange && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                                    diffDias > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-[#008200]'
                                  }`}>
                                    {diffDias > 0 ? '+' : ''}{diffDias}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                    })}
                    {compareData.currentData.length === 0 && (
                      <tr><td colSpan="4" className="p-8 text-center text-slate-400">Nenhum dado para comparar.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv" />
    </div>
  );
}
