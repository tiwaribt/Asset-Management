import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  Users, 
  Settings as SettingsIcon, 
  Search, 
  Bell, 
  User, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  QrCode,
  Barcode as BarcodeIcon,
  History,
  Wrench,
  ChevronRight,
  MoreVertical,
  Filter,
  Download,
  Trash2,
  Edit,
  Globe
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { format, differenceInYears, parseISO } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Asset {
  id: number;
  tag_id: string;
  name: string;
  category: string;
  status: string;
  location: string;
  purchase_date: string;
  purchase_price: number;
  salvage_value: number;
  useful_life: number;
  assigned_to?: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
}

interface Settings {
  currency: string;
  currency_symbol: string;
}

const SettingsContext = createContext<{
  settings: Settings;
  refreshSettings: () => void;
}>({
  settings: { currency: 'NPR', currency_symbol: 'रू' },
  refreshSettings: () => {},
});

const useSettings = () => useContext(SettingsContext);

// --- Components ---

const Sidebar = () => {
  const location = window.location.pathname;
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Package, label: "Assets", path: "/assets" },
    { icon: PlusCircle, label: "Add Asset", path: "/add" },
    { icon: Users, label: "Users", path: "/users" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="w-64 bg-[#141414] text-white h-screen flex flex-col border-r border-[#262626]">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
          <Package className="w-5 h-5 text-black" />
        </div>
        <h1 className="text-xl font-bold tracking-tight italic font-serif">AssetFlow</h1>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
              location === item.path 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <item.icon className={cn("w-5 h-5", location === item.path ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-300")} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[#262626]">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <User className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Admin User</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ title }: { title: string }) => (
  <header className="h-16 border-b border-[#262626] bg-[#141414] flex items-center justify-between px-8 sticky top-0 z-10">
    <div className="flex items-center gap-4">
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
    </div>
    <div className="flex items-center gap-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search assets..." 
          className="bg-zinc-900 border border-zinc-800 rounded-md pl-10 pr-4 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
        />
      </div>
      <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#141414]"></span>
      </button>
    </div>
  </header>
);

const StatCard = ({ label, value, trend, trendValue, icon: Icon }: any) => (
  <div className="bg-[#1C1C1C] border border-[#262626] p-6 rounded-xl">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-zinc-900 rounded-lg">
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trend === 'up' ? "text-emerald-500" : "text-rose-500")}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
    <h3 className="text-2xl font-bold text-zinc-100 font-mono">{value}</h3>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const { settings } = useSettings();

  useEffect(() => {
    fetch("/api/stats").then(res => res.json()).then(setStats);
  }, []);

  if (!stats) return <div className="p-8 text-zinc-500">Loading dashboard...</div>;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Assets" value={stats.totalAssets} trend="up" trendValue="+12%" icon={Package} />
        <StatCard label="Total Value" value={`${settings.currency_symbol}${stats.totalValue.toLocaleString()}`} trend="up" trendValue="+5.4%" icon={Activity} />
        <StatCard label="In Maintenance" value={stats.statusCounts.find((s:any) => s.status === 'maintenance')?.count || 0} icon={Wrench} />
        <StatCard label="Active Users" value="14" trend="up" trendValue="+2" icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1C1C1C] border border-[#262626] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6 italic font-serif">Asset Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="status" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-6 italic font-serif">Status Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.statusCounts.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.statusCounts.map((s: any, i: number) => (
              <div key={s.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-zinc-400 capitalize">{s.status}</span>
                </div>
                <span className="text-zinc-100 font-mono">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetList = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const navigate = useNavigate();
  const { settings } = useSettings();

  useEffect(() => {
    fetch("/api/assets").then(res => res.json()).then(setAssets);
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 italic font-serif">Asset Inventory</h2>
          <p className="text-zinc-500 text-sm">Manage and track your organization's physical resources.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-[#262626] bg-zinc-900/50">
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Tag ID</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Asset Name</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Category</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Status</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Location</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Purchase Date</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif text-right">Value</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {assets.map((asset) => (
              <tr 
                key={asset.id} 
                className="hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/assets/${asset.id}`)}
              >
                <td className="px-6 py-4 text-sm font-mono text-emerald-500">{asset.tag_id}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-zinc-100">{asset.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-zinc-400 capitalize">{asset.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    asset.status === 'available' ? "bg-emerald-500/10 text-emerald-500" :
                    asset.status === 'maintenance' ? "bg-amber-500/10 text-amber-500" :
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Activity className="w-3 h-3 text-zinc-600" />
                    {asset.location}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {asset.purchase_date}
                </td>
                <td className="px-6 py-4 text-sm font-mono text-zinc-300 text-right">
                  {settings.currency_symbol}{asset.purchase_price.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AssetDetail = () => {
  const { id } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { settings } = useSettings();

  useEffect(() => {
    fetch(`/api/assets/${id}`).then(res => res.json()).then(setAsset);
  }, [id]);

  if (!asset) return <div className="p-8 text-zinc-500">Loading asset details...</div>;

  // Depreciation Calculation (Straight-Line)
  const calculateDepreciation = () => {
    const yearsElapsed = differenceInYears(new Date(), parseISO(asset.purchase_date));
    const annualDepreciation = (asset.purchase_price - asset.salvage_value) / asset.useful_life;
    const currentBookValue = Math.max(asset.salvage_value, asset.purchase_price - (annualDepreciation * yearsElapsed));
    return { annualDepreciation, currentBookValue, yearsElapsed };
  };

  const { annualDepreciation, currentBookValue, yearsElapsed } = calculateDepreciation();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4 uppercase tracking-widest">
        <Link to="/assets" className="hover:text-emerald-500 transition-colors">Inventory</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-300">{asset.tag_id}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-2 italic font-serif">{asset.name}</h1>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-emerald-500">{asset.tag_id}</span>
                  <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                  <span className="text-xs text-zinc-500 uppercase tracking-widest">{asset.category} Asset</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 bg-zinc-800 text-rose-500/50 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-y border-[#262626]">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm font-semibold text-emerald-500 capitalize">{asset.status}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Location</p>
                <p className="text-sm font-semibold text-zinc-200">{asset.location}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Purchase Date</p>
                <p className="text-sm font-semibold text-zinc-200">{asset.purchase_date}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Assigned To</p>
                <p className="text-sm font-semibold text-zinc-200">Unassigned</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex gap-8 border-b border-[#262626]">
                {['overview', 'tracking', 'maintenance', 'depreciation'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
                      activeTab === tab ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>}
                  </button>
                ))}
              </div>

              <div className="py-8">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-zinc-400 italic font-serif">Financial Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-900/50 rounded-lg border border-[#262626]">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Purchase Price</p>
                          <p className="text-lg font-mono text-zinc-100">{settings.currency_symbol}{asset.purchase_price.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-zinc-900/50 rounded-lg border border-[#262626]">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Current Value</p>
                          <p className="text-lg font-mono text-emerald-500">{settings.currency_symbol}{currentBookValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-zinc-400 italic font-serif">Asset Lifecycle</h4>
                      <div className="p-4 bg-zinc-900/50 rounded-lg border border-[#262626]">
                        <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                          <span>Usage Progress</span>
                          <span>{Math.round((yearsElapsed / asset.useful_life) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${(yearsElapsed / asset.useful_life) * 100}%` }}
                          ></div>
                        </div>
                        <p className="mt-3 text-[10px] text-zinc-500">Useful Life: {asset.useful_life} years</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'tracking' && (
                  <div className="space-y-6">
                    <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-[#262626]">
                      <div className="relative">
                        <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-200">Asset Registered</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{asset.created_at}</p>
                          <p className="mt-2 text-xs text-zinc-400">Initial recording at {asset.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-8">
          <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-6 text-center">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 italic font-serif">Identification</h3>
            <div className="bg-white p-4 rounded-lg inline-block mb-6">
              <QRCodeSVG value={asset.tag_id} size={160} />
            </div>
            <div className="flex justify-center mb-6">
              <Barcode value={asset.tag_id} width={1.5} height={40} fontSize={12} background="transparent" lineColor="#a1a1aa" />
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors">
              <Download className="w-3 h-3" />
              Download Labels
            </button>
          </div>

          <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-6">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 italic font-serif">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                <History className="w-4 h-4" />
                Transfer Location
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                <Wrench className="w-4 h-4" />
                Schedule Maintenance
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                <QrCode className="w-4 h-4" />
                Print QR Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddAsset = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    tag_id: `AST-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    name: '',
    category: 'fixed',
    status: 'available',
    location: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    purchase_price: '',
    salvage_value: '0',
    useful_life: '5'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        salvage_value: parseFloat(formData.salvage_value),
        useful_life: parseInt(formData.useful_life)
      })
    });
    if (res.ok) navigate("/assets");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 italic font-serif">Record New Asset</h2>
        <p className="text-zinc-500 text-sm">Enter asset details to generate tracking identifiers and financial records.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Asset Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. MacBook Pro M3"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tag ID (Auto-generated)</label>
              <input 
                disabled
                type="text" 
                value={formData.tag_id}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-500 font-mono cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Category</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="fixed">Fixed Asset</option>
                <option value="movable">Movable Asset</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Initial Location</label>
              <input 
                required
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="e.g. Main Office - Floor 2"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-8 space-y-6">
          <h3 className="text-sm font-semibold text-zinc-400 italic font-serif">Financial & Lifecycle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Purchase Price ({settings.currency_symbol})</label>
              <input 
                required
                type="number" 
                value={formData.purchase_price}
                onChange={e => setFormData({...formData, purchase_price: e.target.value})}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Salvage Value ({settings.currency_symbol})</label>
              <input 
                required
                type="number" 
                value={formData.salvage_value}
                onChange={e => setFormData({...formData, salvage_value: e.target.value})}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Useful Life (Years)</label>
              <input 
                required
                type="number" 
                value={formData.useful_life}
                onChange={e => setFormData({...formData, useful_life: e.target.value})}
                placeholder="5"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={() => navigate("/assets")}
            className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-8 py-2.5 bg-emerald-500 text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
          >
            Register Asset
          </button>
        </div>
      </form>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users").then(res => res.json()).then(setUsers);
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 italic font-serif">User Management</h2>
        <p className="text-zinc-500 text-sm">Manage system access and assign roles to staff members.</p>
      </div>

      <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-[#262626] bg-zinc-900/50">
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Full Name</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Username</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif">Role</th>
              <th className="px-6 py-4 text-xs font-medium text-zinc-500 uppercase tracking-wider italic font-serif text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-zinc-100">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{user.username}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    user.role === 'admin' ? "bg-emerald-500/10 text-emerald-500" :
                    user.role === 'manager' ? "bg-amber-500/10 text-amber-500" :
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SystemSettings = () => {
  const { settings, refreshSettings } = useSettings();
  const [formData, setFormData] = useState({
    currency: settings.currency,
    currency_symbol: settings.currency_symbol
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      currency: settings.currency,
      currency_symbol: settings.currency_symbol
    });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      refreshSettings();
      alert("Settings updated successfully");
    }
    setSaving(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 italic font-serif">System Settings</h2>
        <p className="text-zinc-500 text-sm">Configure global application parameters and localization.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-[#1C1C1C] border border-[#262626] rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest italic font-serif">Localization</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Currency Code</label>
              <input 
                type="text" 
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
                placeholder="e.g. NPR, USD"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Currency Symbol</label>
              <input 
                type="text" 
                value={formData.currency_symbol}
                onChange={e => setFormData({...formData, currency_symbol: e.target.value})}
                placeholder="e.g. रू, $"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-emerald-500 text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function App() {
  const [settings, setSettings] = useState<Settings>({ currency: 'NPR', currency_symbol: 'रू' });

  const fetchSettings = () => {
    fetch("/api/settings").then(res => res.json()).then(setSettings);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      <Router>
        <div className="flex h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-500">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header title="AssetFlow Pro" />
            <main className="flex-1 overflow-y-auto bg-[#141414]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/assets" element={<AssetList />} />
                <Route path="/assets/:id" element={<AssetDetail />} />
                <Route path="/add" element={<AddAsset />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/settings" element={<SystemSettings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </SettingsContext.Provider>
  );
}
