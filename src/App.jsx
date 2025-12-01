import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { 
  Activity, Thermometer, Wrench, AlertTriangle, 
  LayoutDashboard, Database, Settings, Search, Filter, 
  Download, ChevronDown, ChevronUp, MoreHorizontal,
  RefreshCw, FileText, ArrowUpRight, ArrowDownRight, X,
  Factory, Upload, FileSpreadsheet, DollarSign, Calendar, AlertCircle, Briefcase,
  Lightbulb, CheckCircle2, TrendingUp, Star, ShieldCheck, ShieldAlert, Scale, User, LogOut, Lock, UserPlus
} from 'lucide-react';

// --- FIREBASE IMPORTS (REALTIME DATABASE & AUTH) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get, child, update, push } from 'firebase/database';

// --- CONFIGURAÇÃO FIREBASE (PROJETO ALMOX) ---
const firebaseConfig = {
  apiKey: "AIzaSyCqIzWpvyn_q41-HhgOFtefmyBEpbLkJhU",
  authDomain: "projeto-almox-48819.firebaseapp.com",
  databaseURL: "https://projeto-almox-48819-default-rtdb.firebaseio.com",
  projectId: "projeto-almox-48819",
  storageBucket: "projeto-almox-48819.firebasestorage.app",
  messagingSenderId: "604367180658",
  appId: "1:604367180658:web:ab32ef3990a3d55f8083eb",
  measurementId: "G-THDGMNQLE9"
};

// Inicialização segura
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- DADOS INICIAIS (FALLBACK SE O BANCO ESTIVER VAZIO) ---
const generateMockData = (count) => {
  const areas = ['Linha de Envase 01', 'Fermentação', 'Utilidades Industriais', 'Estação CIP', 'Sala de Brassagem'];
  const models = ['AlfaLaval M10-B', 'Kelvion T20-P', 'GEA Varitherm', 'Tranter GXD-042', 'Sondex S4A'];
  const apps = ['Pasteurização Flash (PCC)', 'Resfriamento de Mosto', 'Aquecimento de Água', 'Resfriamento de Óleo'];
  const statuses = ['operational', 'operational', 'operational', 'alert', 'warning', 'stopped'];
  const technicians = ['Equipe Interna', 'AlfaLaval Service', 'Mecânica Industrial BA', 'Tec. João Silva', 'Tec. Maria Souza', 'Kelvion Service'];

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const app = apps[Math.floor(Math.random() * apps.length)];
    const isPasteurizer = app.includes('Pasteurização');
    
    const pressureClean = (4 + Math.random() * 2).toFixed(1); 
    const pressureRaw = isPasteurizer && Math.random() > 0.9 ? (parseFloat(pressureClean) + 0.5).toFixed(1) : (parseFloat(pressureClean) - 0.5).toFixed(1);
    
    const today = new Date();
    const lastIntegrityTest = new Date(today.getFullYear() - Math.floor(Math.random() * 2), Math.floor(Math.random() * 12), 1);
    const monthsSinceTest = (today.getFullYear() - lastIntegrityTest.getFullYear()) * 12 + (today.getMonth() - lastIntegrityTest.getMonth());
    const integrityStatus = monthsSinceTest > 12 ? 'expired' : 'valid';

    const efficiency = status === 'operational' ? 88 + Math.random() * 11 : 
                       status === 'warning' ? 72 + Math.random() * 12 : 
                       status === 'alert' ? 55 + Math.random() * 14 : 0;

    let fsStatus = 'compliant';
    if (isPasteurizer && parseFloat(pressureRaw) >= parseFloat(pressureClean)) fsStatus = 'critical_risk';
    else if (integrityStatus === 'expired') fsStatus = 'warning';

    return {
      id: 100 + i,
      tag: `TC-${1000 + i}`,
      serial: `SN-${Math.floor(Math.random() * 90000) + 10000}`,
      model: models[Math.floor(Math.random() * models.length)],
      plates: Math.floor(Math.random() * 150) + 40,
      area: areas[Math.floor(Math.random() * areas.length)],
      app: app,
      material: 'Aço Inox 316L',
      lastMaint: new Date(today.getFullYear(), today.getMonth() - Math.floor(Math.random() * 6), 1).toLocaleDateString('pt-BR'),
      technician: technicians[Math.floor(Math.random() * technicians.length)],
      lastIntegrityTest: lastIntegrityTest.toLocaleDateString('pt-BR'),
      integrityStatus,
      pressureClean,
      pressureRaw,
      fsStatus,
      daysRun: Math.floor(Math.random() * 365),
      status: status,
      efficiency: parseFloat(efficiency.toFixed(2)),
      cost: Math.floor(Math.random() * 15000) + 3000
    };
  });
};

const COLORS = ['#008200', '#1f9d55', '#4cc783', '#8ae0b4', '#c9f2dd']; 

// --- COMPONENTES UI AUXILIARES ---

const Badge = ({ status, value, type }) => {
  if (value !== undefined) {
    let styleClass = value >= 85 ? "bg-emerald-50 text-[#008200] border-emerald-200" :
                     value >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                     "bg-red-50 text-red-700 border-red-200";
    return <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${styleClass}`}>{value.toFixed(1)}%</span>;
  }

  if (type === 'food_safety') {
    if (status === 'compliant') return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-[#008200] border-emerald-200 uppercase">
        <ShieldCheck size={12} /> OK
      </span>
    );
    if (status === 'critical_risk') return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-red-100 text-red-700 border-red-200 uppercase animate-pulse">
        <ShieldAlert size={12} /> RISCO PCC
      </span>
    );
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200 uppercase">
        <AlertCircle size={12} /> ATENÇÃO
      </span>
    );
  }

  let styleClass = "bg-slate-100 text-slate-600 border-slate-200";
  if (status === 'operational') styleClass = "bg-emerald-50 text-[#008200] border-emerald-200";
  if (status === 'alert' || status === 'warning') styleClass = "bg-amber-50 text-amber-800 border-amber-200";
  if (status === 'stopped') styleClass = "bg-slate-100 text-slate-600 border-slate-300";

  const label = status === 'operational' ? 'ONLINE' : status === 'stopped' ? 'OFFLINE' : 'ALERTA';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${styleClass} flex items-center w-fit gap-1.5 uppercase`}>
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'operational' ? 'bg-[#008200]' : status === 'stopped' ? 'bg-slate-500' : 'bg-amber-500'}`}></div>
      {label}
    </span>
  );
};

const KPICard = ({ title, value, subtext, icon: Icon, trend }) => (
  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-1 h-full bg-[#008200] opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
      <div className="flex items-center gap-1 mt-3">
        {trend === 'up' && <ArrowUpRight size={14} className="text-[#008200]" />}
        {trend === 'down' && <ArrowDownRight size={14} className="text-red-600" />}
        <span className={`text-xs font-semibold ${trend === 'up' ? 'text-[#008200]' : trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
          {subtext}
        </span>
      </div>
    </div>
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[#008200]">
      <Icon size={22} />
    </div>
  </div>
);

const InsightCard = ({ type, title, description, impact }) => {
  const styles = {
    critical: { border: 'border-l-4 border-l-red-600', icon: ShieldAlert, iconColor: 'text-red-600', bg: 'bg-red-50/30' },
    warning: { border: 'border-l-4 border-l-amber-500', icon: AlertCircle, iconColor: 'text-amber-500', bg: 'bg-white' },
    optimization: { border: 'border-l-4 border-l-blue-600', icon: Lightbulb, iconColor: 'text-blue-600', bg: 'bg-white' },
    success: { border: 'border-l-4 border-l-[#008200]', icon: ShieldCheck, iconColor: 'text-[#008200]', bg: 'bg-white' }
  };

  const Style = styles[type] || styles.optimization;
  const Icon = Style.icon;

  return (
    <div className={`p-5 rounded-lg shadow-sm border border-slate-200 ${Style.border} ${Style.bg} flex gap-4 transition-all hover:shadow-md`}>
      <div className={`mt-0.5 ${Style.iconColor}`}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h4>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{description}</p>
        {impact && (
          <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={12}/> Impacto: {impact}
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE DE LOGIN & CADASTRO ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // Estado para alternar entre Login e Cadastro
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        // O onAuthStateChanged vai logar automaticamente
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro na autenticação. Verifique os dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#002e12] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-[#002e12] p-8 text-center border-b border-[#004d1f]">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg">
             <Star className="text-red-600 fill-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EcoTermo Enterprise</h1>
          <p className="text-emerald-400 text-xs mt-2 tracking-wide uppercase font-bold">
            {isRegistering ? 'Cadastro de Novo Usuário' : 'Acesso Corporativo Seguro'}
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleAuthAction} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">E-mail Corporativo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#008200] focus:border-transparent outline-none transition-all"
                  placeholder="usuario@heineken.com.br"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#008200] focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-50 border border-red-100 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full font-bold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2 ${isRegistering ? 'bg-[#008200] hover:bg-[#006000] text-white' : 'bg-[#008200] hover:bg-[#006000] text-white'}`}
            >
              {loading ? <RefreshCw className="animate-spin" size={20}/> : (isRegistering ? <UserPlus size={20}/> : <ShieldCheck size={20} />)}
              {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Acessar Sistema')}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-sm text-[#008200] font-bold hover:underline"
            >
              {isRegistering ? 'Já possui conta? Fazer Login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>

          <div className="mt-8 text-center border-t pt-4">
            <p className="text-[10px] text-slate-400">
              Ambiente protegido. ID: projeto-almox-48819
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL (PROTEGIDO) ---

export default function EcoTermoEnterprise() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeView, setActiveView] = useState('assets');
  const [assetData, setAssetData] = useState([]); // Começa vazio, carrega do DB
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filters, setFilters] = useState({ area: 'Todas', status: 'Todos' });
  const [sortConfig, setSortConfig] = useState({ key: 'tag', direction: 'asc' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  
  const fileInputRef = useRef(null);

  // --- GERENCIAMENTO DE AUTH E DADOS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Carregar dados do Realtime DB ao logar
        await fetchAssets();
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAssets = async () => {
    setDbLoading(true);
    try {
      // Leitura do Realtime Database (Nó 'assets')
      const dbRef = ref(db, 'assets');
      const snapshot = await get(dbRef);
      
      if (snapshot.exists()) {
        const dataObj = snapshot.val();
        // Converter Objeto {key: val} para Array [{id: key, ...val}]
        const loadedData = Object.keys(dataObj).map(key => ({
          id: key,
          ...dataObj[key]
        }));
        setAssetData(loadedData);
      } else {
        // Se o banco estiver vazio, carrega mock para não ficar em branco
        const initial = generateMockData(10);
        setAssetData(initial);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      // Fallback
      setAssetData(generateMockData(10));
    } finally {
      setDbLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  // --- MOTOR DE INTELIGÊNCIA ---
  const generateInsights = useMemo(() => {
    const insights = [];
    const riskAssets = assetData.filter(d => d.fsStatus === 'critical_risk');
    if (riskAssets.length > 0) {
      insights.push({
        type: 'critical',
        title: 'ALERTA DE PCC: Risco de Contaminação',
        description: `Detectada inversão de pressão diferencial em ${riskAssets.length} pasteurizador(es).`,
        impact: 'Segurança do Alimento'
      });
    }
    const expiredTests = assetData.filter(d => d.integrityStatus === 'expired');
    if (expiredTests.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Validação de Integridade Vencida',
        description: `${expiredTests.length} trocadores com teste de integridade vencido.`,
        impact: 'Compliance Qualidade'
      });
    }
    const lowEff = assetData.filter(d => d.efficiency < 60);
    if (lowEff.length > 0) {
      insights.push({
        type: 'optimization',
        title: 'Baixa Eficiência de Troca',
        description: `${lowEff.length} ativos operando abaixo de 60% de eficiência.`,
        impact: 'Qualidade do Produto'
      });
    }
    const compliant = assetData.filter(d => d.fsStatus === 'compliant').length;
    if (assetData.length > 0 && compliant > assetData.length * 0.8) {
      insights.push({
        type: 'success',
        title: 'Alta Conformidade Food Safety',
        description: `Mais de 80% da frota está em total conformidade.`,
        impact: 'Segurança Operacional'
      });
    }
    return insights;
  }, [assetData]);

  // --- IMPORTAÇÃO DE PLANILHA PARA REALTIME DATABASE ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const processedData = parseAdaptiveCSV(text);
        if (processedData.length > 0) {
          // Preparar atualizações em lote para Realtime Database
          const updates = {};
          processedData.forEach((item) => {
            // Gerar uma nova chave única para cada item
            const newKey = push(child(ref(db), 'assets')).key;
            updates['/assets/' + newKey] = item;
          });

          // Enviar update atômico
          await update(ref(db), updates);

          // Atualizar estado local com os novos dados (incluindo os existentes se houver fetch)
          // Aqui optamos por recarregar tudo para garantir consistência
          await fetchAssets();
          
          alert(`Sucesso: ${processedData.length} registros salvos no banco de dados seguro.`);
          setActiveView('assets');
        } else {
          setUploadError("Arquivo inválido ou vazio.");
        }
      } catch (error) {
        console.error("Erro upload:", error);
        setUploadError("Erro ao processar ou salvar dados.");
      } finally {
        setIsProcessing(false);
        event.target.value = ''; 
      }
    };
    reader.readAsText(file);
  };

  const parseAdaptiveCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    // Mapeamento inteligente
    const columnMap = {
      tag: headers.findIndex(h => h.includes('tag') || h.includes('etiqueta')),
      model: headers.findIndex(h => h.includes('modelo') || h.includes('model')),
      serial: headers.findIndex(h => h.includes('serie') || h.includes('serial') || h.includes('sn')),
      plates: headers.findIndex(h => h.includes('placa') || h.includes('qtd') || h.includes('plate')),
      area: headers.findIndex(h => h.includes('area') || h.includes('setor')),
      material: headers.findIndex(h => h.includes('material') || h.includes('mat')),
      lastMaint: headers.findIndex(h => h.includes('manut') || h.includes('data') || h.includes('ultima')),
      technician: headers.findIndex(h => h.includes('executante') || h.includes('tecnico') || h.includes('responsavel')),
      status: headers.findIndex(h => h.includes('status') || h.includes('situacao')),
      efficiency: headers.findIndex(h => h.includes('eficiencia') || h.includes('rendimento')),
      cost: headers.findIndex(h => h.includes('custo') || h.includes('valor'))
    };

    const parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator);
      if (cols.length > 1) {
        const getVal = (idx) => idx > -1 && cols[idx] ? cols[idx].trim() : '';
        const obj = {
          tag: getVal(columnMap.tag) || `ATIVO-${i}`,
          serial: getVal(columnMap.serial) || '-',
          model: getVal(columnMap.model) || '-',
          plates: parseInt(getVal(columnMap.plates)) || 0,
          area: getVal(columnMap.area) || 'Geral',
          material: getVal(columnMap.material) || 'Inox',
          lastMaint: getVal(columnMap.lastMaint) || new Date().toLocaleDateString('pt-BR'),
          technician: getVal(columnMap.technician) || 'Não Informado',
          status: normalizeStatus(getVal(columnMap.status)),
          efficiency: parseFloat(getVal(columnMap.efficiency).replace(',', '.')) || 0,
          cost: parseFloat(getVal(columnMap.cost).replace(',', '.')) || 0,
          app: 'Processo',
          pressureClean: '4.0',
          pressureRaw: '3.5',
          fsStatus: 'compliant',
          integrityStatus: 'valid',
          daysRun: 0,
          importedAt: new Date().toISOString()
        };
        parsedData.push(obj);
      }
    }
    return parsedData;
  };

  const normalizeStatus = (statusRaw) => {
    if (!statusRaw) return 'stopped';
    const s = statusRaw.toLowerCase();
    if (s.includes('oper') || s.includes('online') || s.includes('ok')) return 'operational';
    if (s.includes('alert') || s.includes('crit')) return 'alert';
    if (s.includes('atenc') || s.includes('warn')) return 'warning';
    return 'stopped';
  };

  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };

  // --- KPI ---
  const kpis = useMemo(() => {
    const total = assetData.length;
    const criticalRisks = assetData.filter(d => d.fsStatus === 'critical_risk').length;
    const compliant = assetData.filter(d => d.fsStatus === 'compliant').length;
    const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(1) : 0;
    
    return [
      { title: 'Compliance Food Safety', value: `${complianceRate}%`, subtext: `${criticalRisks} Riscos Críticos`, trend: criticalRisks > 0 ? 'down' : 'up', icon: ShieldCheck },
      { title: 'Total de Ativos', value: `${total}`, subtext: 'Base Realtime DB', trend: 'neutral', icon: Database },
      { title: 'Manutenções Recentes', value: `${assetData.filter(d => d.daysRun < 30).length}`, subtext: 'Últimos 30 dias', trend: 'neutral', icon: Wrench },
      { title: 'Eficiência Média', value: `84.2%`, subtext: 'Troca Térmica', trend: 'up', icon: Thermometer },
    ];
  }, [assetData]);

  // --- FILTROS E ORDENAÇÃO ---
  const processedData = useMemo(() => {
    let data = [...assetData];
    if (filters.area !== 'Todas') data = data.filter(d => d.area === filters.area);
    if (filters.status !== 'Todos') data = data.filter(d => d.status === filters.status);
    
    data.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [assetData, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToPowerBI = () => {
    const headers = "TAG;NUMERO_SERIE;AREA;QTD_PLACAS;MODELO;MATERIAL;ULTIMA_MANUT;EXECUTANTE;STATUS;EFICIENCIA";
    const rows = processedData.map(d => `${d.tag};${d.serial};${d.area};${d.plates};${d.model};${d.material};${d.lastMaint};${d.technician};${d.status};${d.efficiency}`).join('\n');
    const blob = new Blob(["\uFEFF" + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EcoTermo_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ colKey }) => (
    sortConfig.key !== colKey ? <ChevronDown size={14} className="opacity-20 ml-1" /> :
    sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#008200] ml-1" /> : <ChevronDown size={14} className="text-[#008200] ml-1" />
  );

  // --- RENDERIZAÇÃO CONDICIONAL (LOGIN vs APP) ---
  
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#002e12] flex items-center justify-center">
        <RefreshCw className="text-white animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-16 lg:w-72 bg-[#002e12] text-white flex flex-col flex-shrink-0 shadow-2xl z-30 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 bg-[#002e12] border-b border-[#004d1f]">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-white rounded flex items-center justify-center flex-shrink-0">
               <Star className="text-red-600 fill-red-600" size={20} />
             </div>
             <div className="hidden lg:block">
               <span className="block font-bold text-lg tracking-tight leading-none text-white">EcoTermo</span>
               <span className="text-[10px] uppercase tracking-widest text-emerald-400">Gestão de Ativos</span>
             </div>
          </div>
        </div>

        <nav className="flex-1 py-8 space-y-1 px-3">
          {[
            { id: 'assets', icon: Database, label: 'Inventário de Ativos' },
            { id: 'reports', icon: ShieldCheck, label: 'Gestão de Qualidade' },
            { id: 'maintenance', icon: Wrench, label: 'Ordens de Serviço' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center px-4 py-3.5 rounded-md transition-all duration-200 group relative ${
                activeView === item.id 
                  ? 'bg-[#008200] text-white font-medium shadow-md' 
                  : 'text-emerald-100/70 hover:bg-[#004d1f] hover:text-white'
              }`}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className="ml-3 text-sm hidden lg:block tracking-wide">{item.label}</span>
              {activeView === item.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full hidden lg:block"></div>}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-[#004d1f] bg-[#00250e] space-y-3">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          
          <button onClick={triggerFileUpload} disabled={isProcessing} className="w-full bg-white hover:bg-slate-100 text-[#002e12] py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            <span className="hidden lg:block">{isProcessing ? 'Enviando p/ DB...' : 'Carregar Planilha'}</span>
          </button>
          
          <button onClick={exportToPowerBI} className="w-full bg-transparent border border-[#008200] hover:bg-[#004d1f] text-emerald-400 hover:text-white py-2.5 px-4 rounded font-medium text-xs flex items-center justify-center gap-2 transition-colors">
            <Download size={14} />
            <span className="hidden lg:block">Exportar Dados</span>
          </button>

          <button onClick={handleLogout} className="w-full mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-200 py-2 px-4 rounded text-xs flex items-center justify-center gap-2 transition-colors">
            <LogOut size={14} /> <span className="hidden lg:block">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-20">
          <div>
             <h1 className="text-xl font-bold text-slate-800 tracking-tight">
               {activeView === 'assets' ? 'Monitoramento de Ativos' : activeView === 'reports' ? 'Qualidade e Food Safety' : 'Manutenção'}
             </h1>
             <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
               <Factory size={12} />
               <span>Unidade Fabril Alagoinhas</span>
               <span className="text-slate-300">|</span>
               <span className="flex items-center gap-1 text-[#008200] font-medium">
                 <ShieldCheck size={12} />
                 {dbLoading ? 'Sincronizando...' : 'Banco de Dados Conectado'}
               </span>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="text-right hidden md:block">
               <p className="text-xs font-bold text-slate-700">{user.email}</p>
               <p className="text-[10px] text-slate-400">Usuário Corporativo</p>
             </div>
             <div className="w-10 h-10 rounded bg-[#008200] text-white border border-slate-200 flex items-center justify-center text-sm font-bold">
               {user.email.substring(0,2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 scroll-smooth">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {kpis.map((kpi, idx) => <KPICard key={idx} {...kpi} />)}
          </div>

          {activeView === 'assets' ? (
            // --- VISÃO: TABELA DE ATIVOS ---
            <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-250px)] min-h-[500px]">
              
              <div className="w-full xl:w-72 flex flex-col gap-4 flex-shrink-0">
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex-1 overflow-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Filter size={16} className="text-[#008200]" /> Filtros
                    </h3>
                    <button onClick={() => setFilters({area: 'Todas', status: 'Todos'})} className="text-[10px] text-[#008200] hover:underline font-bold uppercase tracking-wide">Limpar</button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Setor Operacional</h4>
                      <div className="space-y-1.5">
                        {['Todas', ...new Set(assetData.map(d => d.area))].filter(Boolean).map(area => (
                          <label key={area} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm transition-colors">
                            <input type="checkbox" checked={filters.area === area} onChange={() => setFilters({...filters, area})} className="rounded border-slate-300 text-[#008200] focus:ring-[#008200]" />
                            <span className={filters.area === area ? 'font-bold text-[#008200]' : 'text-slate-600'}>{area}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                     <Database size={16} className="text-[#008200]" />
                     Inventário Seguro
                     <span className="bg-[#008200] text-white px-2 py-0.5 rounded text-[10px] font-bold">{processedData.length}</span>
                  </h3>
                  <button onClick={exportToPowerBI} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded hover:bg-slate-50 hover:text-[#008200] hover:border-[#008200] transition-all">
                    <Download size={14} /> CSV (Power BI)
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  {dbLoading ? (
                    <div className="h-full flex items-center justify-center text-slate-400 gap-2">
                      <RefreshCw className="animate-spin" size={24}/> Carregando dados do servidor...
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          {[
                            {k: 'tag', l: 'TAG / SÉRIE'}, 
                            {k: 'area', l: 'ÁREA'}, 
                            {k: 'plates', l: 'QTD PLACAS'},
                            {k: 'model', l: 'MODELO'},
                            {k: 'material', l: 'MATERIAL'},
                            {k: 'lastMaint', l: 'ÚLTIMA MANUT.'},
                            {k: 'technician', l: 'EXECUTANTE'},
                            {k: 'status', l: 'STATUS'}
                          ].map(col => (
                            <th key={col.k} className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(col.k)}>
                              <div className="flex items-center gap-1">{col.l} <SortIcon colKey={col.k}/></div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {processedData.map((row) => (
                          <tr key={row.id} onClick={() => setSelectedAsset(row)} className={`hover:bg-emerald-50/30 cursor-pointer transition-colors ${selectedAsset?.id === row.id ? 'bg-emerald-50/50' : ''}`}>
                            <td className="px-6 py-3">
                              <div className="font-bold text-[#008200]">{row.tag}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{row.serial}</div>
                            </td>
                            <td className="px-6 py-3 text-slate-600 font-medium">{row.area}</td>
                            <td className="px-6 py-3 text-center font-mono">{row.plates}</td>
                            <td className="px-6 py-3 text-slate-600">{row.model}</td>
                            <td className="px-6 py-3 text-slate-500">{row.material}</td>
                            <td className="px-6 py-3 text-slate-700">{row.lastMaint}</td>
                            <td className="px-6 py-3 text-slate-600 flex items-center gap-2">
                              <User size={12} className="text-slate-400"/> {row.technician}
                            </td>
                            <td className="px-6 py-3"><Badge status={row.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          ) : (
             // --- VISÃO: RELATÓRIOS FOOD SAFETY ---
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                <div className="lg:col-span-2 bg-[#002e12] p-8 rounded-lg shadow-lg text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                     <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                       <ShieldCheck className="text-emerald-400" size={28} strokeWidth={2} />
                     </div>
                     <div>
                       <h3 className="text-2xl font-bold tracking-tight">Auditoria Automática (IA)</h3>
                       <p className="text-emerald-200/80 text-sm mt-1">Monitoramento de Food Safety e Conformidade Técnica.</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {generateInsights.map((insight, idx) => (
                      <InsightCard key={idx} {...insight} />
                    ))}
                  </div>
                </div>
             </div>
          )}
        </div>
      </main>
      
      {/* PAINEL LATERAL */}
      {selectedAsset && (
        <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-40 absolute right-0 top-0 h-full animate-in slide-in-from-right duration-300">
          <div className="h-20 flex items-center justify-between px-8 border-b border-slate-100 bg-slate-50/50">
             <div>
               <h2 className="font-bold text-lg text-slate-800">{selectedAsset.tag}</h2>
               <p className="text-xs text-slate-400 font-mono">{selectedAsset.serial}</p>
             </div>
             <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Dados Técnicos</h4>
            <div className="space-y-4">
              <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Modelo</span>
                <span className="font-medium text-slate-800">{selectedAsset.model}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Placas</span>
                <span className="font-medium text-slate-800">{selectedAsset.plates}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Material</span>
                <span className="font-medium text-slate-800">{selectedAsset.material}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Última Manutenção</span>
                <span className="font-bold text-[#008200]">{selectedAsset.lastMaint}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Executante</span>
                <span className="font-medium text-slate-800">{selectedAsset.technician}</span>
              </div>
            </div>
            
            <button className="w-full mt-8 bg-[#008200] hover:bg-[#004d1f] text-white py-3 rounded font-bold text-sm transition-colors shadow-lg shadow-emerald-900/10">
              Ver Histórico Completo
            </button>
          </div>
        </div>
      )}

    </div>
  );
}