"use client";
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell, ReferenceLine, CartesianGrid, Area, AreaChart,
  PieChart, Pie, Legend, ComposedChart
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// DATA MODEL & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ATTRIBUTES = [
  { key: "permanence", label: "Permanence", desc: "Duration of carbon removal/avoidance" },
  { key: "additionality", label: "Additionality", desc: "Would reduction have happened anyway?" },
  { key: "leakageRisk", label: "Leakage Risk", desc: "Risk of shifting emissions (10 = low risk)" },
  { key: "verificationQuality", label: "Verification", desc: "Rigor of third-party verification" },
  { key: "coBenefits", label: "Co-Benefits", desc: "SDG alignment and community impact" },
  { key: "methodologyMaturity", label: "Methodology", desc: "How established the methodology is" },
  { key: "bufferAdequacy", label: "Buffer Pool", desc: "Insurance against reversal risk" },
  { key: "regulatoryAlignment", label: "Regulatory Fit", desc: "Alignment with CORSIA, Art.6, EU ETS" },
];

const DEFAULT_WEIGHTS = { permanence: 0.20, additionality: 0.18, leakageRisk: 0.12, verificationQuality: 0.12, coBenefits: 0.08, methodologyMaturity: 0.10, bufferAdequacy: 0.10, regulatoryAlignment: 0.10 };
const METHOD_BASE = { "REDD+": 9.0, "Cookstove": 14.0, "Renewable Energy": 4.5, "Blue Carbon": 22.0, "Direct Air Capture": 180.0, "Afforestation": 12.0, "Methane Capture": 8.0, "Biochar": 95.0, "Energy Efficiency": 6.0, "Soil Carbon": 18.0 };
const SDG_COLORS = { 1:"#E5243B", 2:"#DDA63A", 3:"#4C9F38", 4:"#C5192D", 5:"#FF3A21", 6:"#26BDE2", 7:"#FCC30B", 8:"#A21942", 9:"#FD6925", 10:"#DD1367", 11:"#FD9D24", 12:"#BF8B2E", 13:"#3F7E44", 14:"#0A97D9", 15:"#56C02B" };
const SDG_LABELS = { 1:"No Poverty",2:"Zero Hunger",3:"Good Health",4:"Quality Education",5:"Gender Equality",6:"Clean Water",7:"Affordable Energy",8:"Decent Work",9:"Industry & Innovation",10:"Reduced Inequality",11:"Sustainable Cities",12:"Responsible Consumption",13:"Climate Action",14:"Life Below Water",15:"Life on Land" };

const METHODOLOGIES = Object.keys(METHOD_BASE);
const REGISTRIES = ["Verra", "Gold Standard", "ACR", "CAR"];
const REGIONS = ["Southeast Asia", "East Africa", "West Africa", "South Asia", "Latin America", "Europe", "North America", "Central Africa", "Oceania"];
const ALL_SDGS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
const INDUSTRIES = ["Technology", "Energy & Utilities", "Financial Services", "Consumer Goods", "Manufacturing", "Transportation", "Healthcare", "Real Estate", "Agriculture", "Mining & Resources"];
const COMPLIANCE_FRAMEWORKS = ["Voluntary Only", "CORSIA-eligible", "SBTi-aligned", "EU ETS-linked", "Article 6 (Paris Agreement)"];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICING ENGINE (dynamic weights)
// ═══════════════════════════════════════════════════════════════════════════

function calculateFairValue(project, weights) {
  let ws = 0;
  for (const a of ATTRIBUTES) ws += (project.attributes[a.key] / 10) * weights[a.key];
  const qm = 0.5 + ws * 1.3;
  const va = project.vintage >= 2025 ? 1.12 : project.vintage >= 2024 ? 1.08 : project.vintage >= 2023 ? 1.0 : 0.92;
  return +(METHOD_BASE[project.methodology] * qm * va).toFixed(2);
}

function generatePriceHistory(basePrice, volatility, trend, seed) {
  const rng = seededRandom(seed);
  const data = [];
  const start = new Date(2024, 0); // Jan 2024
  let price = basePrice * (0.82 + rng() * 0.2);
  for (let i = 0; i < 24; i++) { // 24 months
    const d = new Date(start); d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    price += (rng() - 0.48) * volatility * basePrice + trend * basePrice * 0.01;
    price = Math.max(basePrice * 0.3, price);
    const issuance = Math.floor(5000 + rng() * 45000);
    const retirement = Math.floor(3000 + rng() * 35000);
    // Simulate a few "trades" per month
    const trades = Math.floor(2 + rng() * 12);
    const volume = Math.floor(1000 + rng() * 20000);
    data.push({ month: label, marketPrice: +price.toFixed(2), issuance, retirement, trades, volume });
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 25 RAW PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

const RAW_PROJECTS = [
  { id:1, name:"Katingan Peatland Restoration", registry:"Verra", registryId:"VCS-1477", methodology:"REDD+", vintage:2024, country:"Indonesia", region:"Southeast Asia", sdgs:[13,15,6,1], issuedTotal:2450000, retiredTotal:1180000, description:"Protects 149,800 ha of tropical peat swamp forest on Borneo from palm oil conversion. Deep peat deposits at significant fire risk. One of the largest REDD+ projects globally.", attributes:{permanence:6,additionality:7,leakageRisk:5,verificationQuality:8,coBenefits:9,methodologyMaturity:8,bufferAdequacy:6,regulatoryAlignment:7}, volatility:0.06, trend:0.3 },
  { id:2, name:"Mai Ndombe REDD+", registry:"Verra", registryId:"VCS-0934", methodology:"REDD+", vintage:2023, country:"DR Congo", region:"Central Africa", sdgs:[13,15,1,2], issuedTotal:3200000, retiredTotal:980000, description:"Protects 300,000 ha of tropical forest in the DRC\u2019s Mai Ndombe province. High deforestation baseline driven by slash-and-burn agriculture. Significant governance challenges.", attributes:{permanence:5,additionality:6,leakageRisk:4,verificationQuality:6,coBenefits:8,methodologyMaturity:8,bufferAdequacy:5,regulatoryAlignment:5}, volatility:0.09, trend:-0.3 },
  { id:3, name:"Cordillera Azul National Park", registry:"Verra", registryId:"VCS-0985", methodology:"REDD+", vintage:2024, country:"Peru", region:"Latin America", sdgs:[13,15,1], issuedTotal:4100000, retiredTotal:2300000, description:"Protects 1.35M ha of Andean-Amazon transition forest in Peru. High biodiversity. Subject to recent scrutiny over baseline methodology and additionality claims.", attributes:{permanence:7,additionality:5,leakageRisk:5,verificationQuality:7,coBenefits:9,methodologyMaturity:8,bufferAdequacy:6,regulatoryAlignment:6}, volatility:0.08, trend:-0.1 },
  { id:4, name:"Kariba REDD+ Forest Protection", registry:"Verra", registryId:"VCS-0902", methodology:"REDD+", vintage:2023, country:"Zimbabwe", region:"East Africa", sdgs:[13,15,1,8], issuedTotal:1900000, retiredTotal:1400000, description:"Protects nearly 785,000 ha of forest and wildlife habitat on the southern shore of Lake Kariba. Community-based conservation model with revenue-sharing agreements.", attributes:{permanence:6,additionality:7,leakageRisk:6,verificationQuality:7,coBenefits:8,methodologyMaturity:8,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.05, trend:0.2 },
  { id:5, name:"Mombasa Clean Cookstoves", registry:"Gold Standard", registryId:"GS-4821", methodology:"Cookstove", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[7,3,5,13], issuedTotal:380000, retiredTotal:290000, description:"Distributes fuel-efficient cookstoves to 45,000 households in coastal Kenya, reducing fuelwood consumption by ~60%. Strong health co-benefits through reduced indoor air pollution.", attributes:{permanence:4,additionality:8,leakageRisk:8,verificationQuality:9,coBenefits:10,methodologyMaturity:9,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.05, trend:0.5 },
  { id:6, name:"Rwanda Improved Stoves Project", registry:"Gold Standard", registryId:"GS-5102", methodology:"Cookstove", vintage:2024, country:"Rwanda", region:"East Africa", sdgs:[7,3,5,13,1], issuedTotal:210000, retiredTotal:175000, description:"Government-backed clean cooking initiative distributing 30,000 improved biomass stoves across rural Rwanda. Strong monitoring infrastructure and high adoption rates.", attributes:{permanence:4,additionality:9,leakageRisk:8,verificationQuality:9,coBenefits:10,methodologyMaturity:9,bufferAdequacy:5,regulatoryAlignment:7}, volatility:0.04, trend:0.6 },
  { id:7, name:"Ghana LPG Transition", registry:"Gold Standard", registryId:"GS-3890", methodology:"Cookstove", vintage:2023, country:"Ghana", region:"West Africa", sdgs:[7,3,13], issuedTotal:150000, retiredTotal:88000, description:"Facilitates transition from charcoal to LPG cooking across 20,000 urban households. Lower co-benefits than biomass stove projects but higher emissions reductions per household.", attributes:{permanence:4,additionality:7,leakageRisk:7,verificationQuality:8,coBenefits:7,methodologyMaturity:8,bufferAdequacy:4,regulatoryAlignment:5}, volatility:0.06, trend:0.1 },
  { id:8, name:"Gujarat Wind Farm Cluster", registry:"Verra", registryId:"VCS-2103", methodology:"Renewable Energy", vintage:2023, country:"India", region:"South Asia", sdgs:[7,13,8], issuedTotal:1800000, retiredTotal:1100000, description:"12 wind turbine installations across Gujarat generating 180MW of clean energy. Displaces coal-fired grid electricity. Additionality increasingly questioned.", attributes:{permanence:9,additionality:4,leakageRisk:9,verificationQuality:7,coBenefits:5,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:8}, volatility:0.04, trend:-0.2 },
  { id:9, name:"Oaxaca Solar Array", registry:"CAR", registryId:"CAR-MX-401", methodology:"Renewable Energy", vintage:2024, country:"Mexico", region:"Latin America", sdgs:[7,13,8,11], issuedTotal:420000, retiredTotal:310000, description:"50MW utility-scale solar installation in Oaxaca providing clean electricity to ~120,000 households.", attributes:{permanence:9,additionality:5,leakageRisk:9,verificationQuality:8,coBenefits:6,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:7}, volatility:0.03, trend:0.0 },
  { id:10, name:"Vietnam Mekong Small Hydro", registry:"Verra", registryId:"VCS-1890", methodology:"Renewable Energy", vintage:2022, country:"Vietnam", region:"Southeast Asia", sdgs:[7,13,6], issuedTotal:680000, retiredTotal:520000, description:"Network of 8 small-scale run-of-river hydroelectric stations. Older vintage with declining additionality claims.", attributes:{permanence:9,additionality:3,leakageRisk:8,verificationQuality:6,coBenefits:4,methodologyMaturity:10,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.05, trend:-0.4 },
  { id:11, name:"Morocco Concentrated Solar", registry:"Gold Standard", registryId:"GS-6201", methodology:"Renewable Energy", vintage:2025, country:"Morocco", region:"Europe", sdgs:[7,13,9], issuedTotal:280000, retiredTotal:95000, description:"Concentrated solar power plant near Ouarzazate with thermal storage. Cutting-edge technology with strong grid displacement.", attributes:{permanence:9,additionality:7,leakageRisk:9,verificationQuality:9,coBenefits:6,methodologyMaturity:7,bufferAdequacy:8,regulatoryAlignment:9}, volatility:0.04, trend:0.5 },
  { id:12, name:"Cispatá Bay Mangrove Conservation", registry:"Verra", registryId:"VCS-2290", methodology:"Blue Carbon", vintage:2024, country:"Colombia", region:"Latin America", sdgs:[14,13,15,1], issuedTotal:85000, retiredTotal:42000, description:"Protects 11,000 ha of mangrove forest along Colombia\u2019s Caribbean coast. Community-managed with strong biodiversity co-benefits.", attributes:{permanence:7,additionality:8,leakageRisk:7,verificationQuality:8,coBenefits:9,methodologyMaturity:6,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.07, trend:0.8 },
  { id:13, name:"Mikoko Pamoja Mangrove", registry:"Gold Standard", registryId:"GS-2091", methodology:"Blue Carbon", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[14,13,1,4], issuedTotal:45000, retiredTotal:38000, description:"Community-led mangrove conservation in Gazi Bay, Kenya. Pioneering blue carbon methodology with global attention.", attributes:{permanence:7,additionality:9,leakageRisk:7,verificationQuality:9,coBenefits:10,methodologyMaturity:6,bufferAdequacy:6,regulatoryAlignment:7}, volatility:0.06, trend:1.0 },
  { id:14, name:"Philippines Seagrass Restoration", registry:"Verra", registryId:"VCS-2450", methodology:"Blue Carbon", vintage:2025, country:"Philippines", region:"Southeast Asia", sdgs:[14,13,15], issuedTotal:22000, retiredTotal:8000, description:"Seagrass meadow restoration across 3,000 ha in Palawan. Newer methodology with permanence challenges.", attributes:{permanence:5,additionality:7,leakageRisk:5,verificationQuality:7,coBenefits:8,methodologyMaturity:4,bufferAdequacy:5,regulatoryAlignment:5}, volatility:0.09, trend:0.3 },
  { id:15, name:"Climeworks Mammoth DAC", registry:"Verra", registryId:"VCS-3010", methodology:"Direct Air Capture", vintage:2025, country:"Iceland", region:"Europe", sdgs:[13,9], issuedTotal:12000, retiredTotal:9500, description:"Direct air capture facility in Iceland. Captures CO\u2082 and mineralizes in basalt for 1,000+ year storage. High cost but rapidly declining.", attributes:{permanence:10,additionality:10,leakageRisk:10,verificationQuality:9,coBenefits:3,methodologyMaturity:5,bufferAdequacy:10,regulatoryAlignment:9}, volatility:0.08, trend:-0.5 },
  { id:16, name:"Carbon Engineering Texas Hub", registry:"ACR", registryId:"ACR-DAC-102", methodology:"Direct Air Capture", vintage:2025, country:"United States", region:"North America", sdgs:[13,9,8], issuedTotal:8000, retiredTotal:7200, description:"Oxy-backed DAC facility in the Permian Basin. Largest planned DAC deployment in North America.", attributes:{permanence:10,additionality:10,leakageRisk:10,verificationQuality:8,coBenefits:4,methodologyMaturity:5,bufferAdequacy:10,regulatoryAlignment:10}, volatility:0.07, trend:-0.3 },
  { id:17, name:"Ethiopia Great Green Wall", registry:"Gold Standard", registryId:"GS-5890", methodology:"Afforestation", vintage:2024, country:"Ethiopia", region:"East Africa", sdgs:[15,13,1,2], issuedTotal:320000, retiredTotal:140000, description:"Reforestation of 25,000 ha of degraded dryland in Tigray. Part of the pan-African Great Green Wall initiative.", attributes:{permanence:5,additionality:8,leakageRisk:6,verificationQuality:7,coBenefits:9,methodologyMaturity:7,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.07, trend:0.2 },
  { id:18, name:"Chilean Patagonia Native Reforestation", registry:"Verra", registryId:"VCS-2780", methodology:"Afforestation", vintage:2024, country:"Chile", region:"Latin America", sdgs:[15,13,6], issuedTotal:180000, retiredTotal:110000, description:"Native species reforestation across 8,000 ha of degraded pastoral land in southern Chile. 200+ year carbon storage profiles.", attributes:{permanence:8,additionality:8,leakageRisk:7,verificationQuality:8,coBenefits:7,methodologyMaturity:7,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.05, trend:0.4 },
  { id:19, name:"Bangladesh Brick Kiln Methane", registry:"Gold Standard", registryId:"GS-4210", methodology:"Methane Capture", vintage:2023, country:"Bangladesh", region:"South Asia", sdgs:[13,11,3], issuedTotal:520000, retiredTotal:410000, description:"Methane destruction from 150 brick kilns converted to improved zigzag technology. Strong local air quality improvements.", attributes:{permanence:8,additionality:8,leakageRisk:8,verificationQuality:8,coBenefits:7,methodologyMaturity:9,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.04, trend:0.3 },
  { id:20, name:"Brazil Landfill Gas-to-Energy", registry:"Verra", registryId:"VCS-1560", methodology:"Methane Capture", vintage:2022, country:"Brazil", region:"Latin America", sdgs:[13,7,11], issuedTotal:890000, retiredTotal:720000, description:"Captures landfill methane at 4 municipal waste sites in S\u00E3o Paulo state. Mature methodology with declining additionality.", attributes:{permanence:8,additionality:5,leakageRisk:9,verificationQuality:7,coBenefits:6,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:6}, volatility:0.04, trend:-0.2 },
  { id:21, name:"Pacific Biochar California", registry:"ACR", registryId:"ACR-BIO-055", methodology:"Biochar", vintage:2025, country:"United States", region:"North America", sdgs:[13,15,2], issuedTotal:15000, retiredTotal:12000, description:"Converts agricultural waste into biochar. 100+ year carbon stability in soil. Growing scientific consensus on permanence.", attributes:{permanence:9,additionality:8,leakageRisk:9,verificationQuality:8,coBenefits:6,methodologyMaturity:5,bufferAdequacy:8,regulatoryAlignment:8}, volatility:0.07, trend:0.4 },
  { id:22, name:"Kenya Biochar from Sugarcane Waste", registry:"Gold Standard", registryId:"GS-6050", methodology:"Biochar", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[13,2,15,1], issuedTotal:8000, retiredTotal:5500, description:"Converts sugarcane bagasse waste into biochar in Kisumu region. Strong co-benefits for food security.", attributes:{permanence:8,additionality:9,leakageRisk:8,verificationQuality:7,coBenefits:9,methodologyMaturity:5,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.08, trend:0.7 },
  { id:23, name:"Turkey Industrial Efficiency Program", registry:"Gold Standard", registryId:"GS-3450", methodology:"Energy Efficiency", vintage:2023, country:"Turkey", region:"Europe", sdgs:[9,13,12], issuedTotal:410000, retiredTotal:280000, description:"Energy efficiency upgrades across 85 industrial facilities. Verified 35% average energy intensity reduction.", attributes:{permanence:8,additionality:6,leakageRisk:8,verificationQuality:8,coBenefits:5,methodologyMaturity:9,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.03, trend:0.0 },
  { id:24, name:"Australian Regenerative Grazing", registry:"ACR", registryId:"ACR-SC-201", methodology:"Soil Carbon", vintage:2024, country:"Australia", region:"Oceania", sdgs:[15,13,2], issuedTotal:95000, retiredTotal:48000, description:"Rotational grazing and cover cropping across 40,000 ha. Newer methodology with variable permanence.", attributes:{permanence:5,additionality:7,leakageRisk:6,verificationQuality:7,coBenefits:7,methodologyMaturity:4,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.08, trend:0.2 },
  { id:25, name:"Cambodia Regenerative Rice", registry:"Gold Standard", registryId:"GS-6180", methodology:"Soil Carbon", vintage:2025, country:"Cambodia", region:"Southeast Asia", sdgs:[2,13,1,6], issuedTotal:35000, retiredTotal:12000, description:"Alternate wetting and drying rice cultivation across 15,000 ha. Reduces methane from paddy flooding by ~50%.", attributes:{permanence:4,additionality:8,leakageRisk:6,verificationQuality:7,coBenefits:9,methodologyMaturity:4,bufferAdequacy:4,regulatoryAlignment:5}, volatility:0.09, trend:0.5 },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENRICHMENT (dynamic based on weights)
// ═══════════════════════════════════════════════════════════════════════════

function enrichProjects(weights) {
  return RAW_PROJECTS.map((p) => {
    const fairValue = calculateFairValue(p, weights);
    const priceHistory = generatePriceHistory(METHOD_BASE[p.methodology], p.volatility, p.trend, p.id * 1337);
    // Add fair value line to price history
    const priceHistoryWithFV = priceHistory.map(d => ({ ...d, fairValue }));
    const currentPrice = priceHistory[priceHistory.length - 1].marketPrice;
    const spread = +((fairValue - currentPrice) / currentPrice * 100).toFixed(1);
    const signal = spread > 8 ? "BUY" : spread < -8 ? "SELL" : "HOLD";
    const overallScore = +(ATTRIBUTES.reduce((s, a) => s + p.attributes[a.key] * weights[a.key], 0)).toFixed(1);
    // Cumulative retirement rate for demand signal
    const totalRet = priceHistory.reduce((s,d) => s + d.retirement, 0);
    const totalIss = priceHistory.reduce((s,d) => s + d.issuance, 0);
    const retirementRate = totalIss > 0 ? +((totalRet / totalIss) * 100).toFixed(0) : 0;
    const demandSignal = retirementRate > 75 ? "Strong" : retirementRate > 50 ? "Moderate" : "Weak";
    // Price momentum (last 3 months vs prior 3)
    const recent3 = priceHistory.slice(-3).reduce((s,d) => s + d.marketPrice, 0) / 3;
    const prior3 = priceHistory.slice(-6, -3).reduce((s,d) => s + d.marketPrice, 0) / 3;
    const momentum = +(((recent3 - prior3) / prior3) * 100).toFixed(1);
    return { ...p, fairValue, currentPrice, priceHistory: priceHistoryWithFV, spread, signal, overallScore, retirementRate, demandSignal, momentum };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SignalBadge({ signal, spread }) {
  const cfg = {
    BUY: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
    SELL: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    HOLD: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  };
  const c = cfg[signal];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
      {signal === "BUY" ? "\u25B2" : signal === "SELL" ? "\u25BC" : "\u25CF"} {signal} ({spread > 0 ? "+" : ""}{spread}%)
    </span>
  );
}

function DemandBadge({ demandSignal }) {
  const cfg = {
    Strong: { bg: "bg-emerald-100", text: "text-emerald-800" },
    Moderate: { bg: "bg-amber-100", text: "text-amber-800" },
    Weak: { bg: "bg-red-100", text: "text-red-800" },
  };
  const c = cfg[demandSignal] || cfg.Moderate;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{demandSignal} Demand</span>;
}

function QualityBar({ score }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-500 w-4 text-right">{score}</span>
    </div>
  );
}

function MiniSparkline({ data, color = "#3B82F6" }) {
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="marketPrice" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SectionCard({ title, subtitle, children, className = "", action }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {(title || subtitle) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: BUYER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

function BuyerProfileTab({ profile, setProfile, weights, projects }) {
  const handleSlider = (key, val) => {
    setProfile(p => ({ ...p, rawWeights: { ...p.rawWeights, [key]: val } }));
  };

  const toggleArrayItem = (field, item) => {
    setProfile(p => {
      const arr = p[field] || [];
      return { ...p, [field]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });
  };

  const matchingProjects = projects.filter(p => {
    if (profile.preferredRegions.length > 0 && !profile.preferredRegions.includes(p.region)) return false;
    if (profile.preferredMethodologies.length > 0 && !profile.preferredMethodologies.includes(p.methodology)) return false;
    if (profile.maxPricePerTonne > 0 && p.currentPrice > profile.maxPricePerTonne) return false;
    return true;
  });
  const buySignals = matchingProjects.filter(p => p.signal === "BUY").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Company Profile" subtitle="Tell us about your organization">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company Name</label>
              <input type="text" value={profile.companyName} onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))}
                placeholder="e.g., Acme Corp" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Industry</label>
              <select value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Compliance Framework</label>
              <select value={profile.complianceFramework} onChange={e => setProfile(p => ({ ...p, complianceFramework: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select framework...</option>
                {COMPLIANCE_FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Procurement Constraints" subtitle="Volume target and budget">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Annual Volume Target (tCO&#8322;e)</label>
              <input type="number" value={profile.volumeTarget} onChange={e => setProfile(p => ({ ...p, volumeTarget: parseInt(e.target.value) || 0 }))}
                placeholder="e.g., 50000" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Max Price per Tonne ($)</label>
              <input type="number" value={profile.maxPricePerTonne} onChange={e => setProfile(p => ({ ...p, maxPricePerTonne: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 25" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-800 font-medium">Max Budget</p>
              <p className="text-lg font-bold text-blue-900">${((profile.volumeTarget * profile.maxPricePerTonne) || 0).toLocaleString()}</p>
              <p className="text-xs text-blue-600">{profile.volumeTarget.toLocaleString()} tonnes × ${profile.maxPricePerTonne}/t ceiling</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Quality Priorities */}
      <SectionCard title="Quality Priorities" subtitle="Drag sliders to weight what matters most. Weights auto-normalize to 100%.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {ATTRIBUTES.map(a => {
            const raw = profile.rawWeights[a.key] || 5;
            const normalizedPct = weights[a.key] ? (weights[a.key] * 100).toFixed(0) : "0";
            return (
              <div key={a.key} className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700">{a.label}</p>
                  <p className="text-xs text-gray-400">{normalizedPct}%</p>
                </div>
                <input type="range" min="0" max="10" step="1" value={raw}
                  onChange={e => handleSlider(a.key, parseInt(e.target.value))}
                  className="flex-1 h-1.5 accent-blue-600" />
                <span className="text-xs font-mono text-gray-500 w-4">{raw}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setProfile(p => ({ ...p, rawWeights: { permanence:10, additionality:8, leakageRisk:5, verificationQuality:9, coBenefits:3, methodologyMaturity:7, bufferAdequacy:6, regulatoryAlignment:9 } }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">Preset: Risk-Averse</button>
          <button onClick={() => setProfile(p => ({ ...p, rawWeights: { permanence:4, additionality:7, leakageRisk:5, verificationQuality:6, coBenefits:10, methodologyMaturity:5, bufferAdequacy:4, regulatoryAlignment:5 } }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">Preset: Impact-First</button>
          <button onClick={() => setProfile(p => ({ ...p, rawWeights: { permanence:10, additionality:10, leakageRisk:8, verificationQuality:8, coBenefits:4, methodologyMaturity:6, bufferAdequacy:9, regulatoryAlignment:10 } }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">Preset: Compliance-Focused</button>
          <button onClick={() => setProfile(p => ({ ...p, rawWeights: Object.fromEntries(ATTRIBUTES.map(a => [a.key, 5])) }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">Reset to Equal</button>
        </div>
      </SectionCard>

      {/* Preferences */}
      <div className="grid grid-cols-3 gap-4">
        <SectionCard title="Preferred Regions" subtitle="Leave empty for all">
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(r => (
              <button key={r} onClick={() => toggleArrayItem("preferredRegions", r)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${profile.preferredRegions.includes(r) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {r}
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Preferred Methodologies" subtitle="Leave empty for all">
          <div className="flex flex-wrap gap-1.5">
            {METHODOLOGIES.map(m => (
              <button key={m} onClick={() => toggleArrayItem("preferredMethodologies", m)}
                className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors ${profile.preferredMethodologies.includes(m) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {m}
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="SDG Priorities" subtitle="Which goals matter most?">
          <div className="flex flex-wrap gap-1.5">
            {ALL_SDGS.map(s => (
              <button key={s} onClick={() => toggleArrayItem("preferredSDGs", s)}
                className={`text-xs px-2 py-1.5 rounded-full font-bold transition-all ${profile.preferredSDGs.includes(s) ? "text-white shadow-sm" : "text-gray-500 bg-gray-100 hover:bg-gray-200"}`}
                style={profile.preferredSDGs.includes(s) ? { backgroundColor: SDG_COLORS[s] } : {}} title={SDG_LABELS[s]}>
                {s}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.preferredSDGs.sort((a,b) => a-b).map(s => (
              <span key={s} className="text-xs text-gray-500">{SDG_LABELS[s]}{profile.preferredSDGs.indexOf(s) < profile.preferredSDGs.length - 1 ? ", " : ""}</span>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Summary */}
      <SectionCard title="Profile Summary">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <p className="text-xs text-blue-600">Matching Projects</p>
            <p className="text-2xl font-bold text-blue-900">{matchingProjects.length}</p>
            <p className="text-xs text-blue-500">of {projects.length} total</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
            <p className="text-xs text-emerald-600">Buy Signals</p>
            <p className="text-2xl font-bold text-emerald-900">{buySignals}</p>
            <p className="text-xs text-emerald-500">undervalued for you</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
            <p className="text-xs text-amber-600">Avg Quality Score</p>
            <p className="text-2xl font-bold text-amber-900">{matchingProjects.length > 0 ? (matchingProjects.reduce((s,p) => s + p.overallScore, 0) / matchingProjects.length).toFixed(1) : "\u2014"}</p>
            <p className="text-xs text-amber-500">your-weighted</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
            <p className="text-xs text-purple-600">Avg Spread</p>
            <p className="text-2xl font-bold text-purple-900">{matchingProjects.length > 0 ? `${(matchingProjects.reduce((s,p) => s + p.spread, 0) / matchingProjects.length > 0 ? "+" : "")}${(matchingProjects.reduce((s,p) => s + p.spread, 0) / matchingProjects.length).toFixed(1)}%` : "\u2014"}</p>
            <p className="text-xs text-purple-500">opportunity level</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: PROJECT EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

function ProjectEvaluationTab({ projects, profile, weights, portfolio, setPortfolio }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || 1);
  const [tab, setTab] = useState("analysis");
  const [sortBy, setSortBy] = useState("spread");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterSignal, setFilterSignal] = useState("All");
  const [filterRegion, setFilterRegion] = useState("All");
  const [search, setSearch] = useState("");
  const [showMatchOnly, setShowMatchOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (showMatchOnly) {
      if (profile.preferredRegions.length > 0) list = list.filter(p => profile.preferredRegions.includes(p.region));
      if (profile.preferredMethodologies.length > 0) list = list.filter(p => profile.preferredMethodologies.includes(p.methodology));
      if (profile.maxPricePerTonne > 0) list = list.filter(p => p.currentPrice <= profile.maxPricePerTonne);
    }
    if (filterMethod !== "All") list = list.filter(p => p.methodology === filterMethod);
    if (filterSignal !== "All") list = list.filter(p => p.signal === filterSignal);
    if (filterRegion !== "All") list = list.filter(p => p.region === filterRegion);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      if (sortBy === "spread") return b.spread - a.spread;
      if (sortBy === "quality") return b.overallScore - a.overallScore;
      if (sortBy === "price") return a.currentPrice - b.currentPrice;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [projects, filterMethod, filterSignal, filterRegion, search, sortBy, showMatchOnly, profile]);

  const selected = projects.find(p => p.id === selectedId);
  const inPortfolio = portfolio.some(h => h.projectId === selectedId);

  const addToPortfolio = (proj) => {
    if (portfolio.some(h => h.projectId === proj.id)) return;
    setPortfolio(prev => [...prev, { projectId: proj.id, quantity: 10000, purchasePrice: proj.currentPrice, dateAdded: new Date().toISOString().split("T")[0] }]);
  };

  const sdgMatchScore = (proj) => {
    if (profile.preferredSDGs.length === 0) return null;
    const matches = proj.sdgs.filter(s => profile.preferredSDGs.includes(s)).length;
    return Math.round((matches / profile.preferredSDGs.length) * 100);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setShowMatchOnly(!showMatchOnly)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium ${showMatchOnly ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {showMatchOnly ? "My Matches" : "All Projects"}
        </button>
        <span className="text-gray-300">|</span>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
          <option value="All">All Methodologies</option>
          {METHODOLOGIES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
          <option value="All">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterSignal} onChange={e => setFilterSignal(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
          <option value="All">All Signals</option>
          <option value="BUY">Buy Only</option>
          <option value="HOLD">Hold Only</option>
          <option value="SELL">Overpriced Only</option>
        </select>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 w-40" />
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-gray-500">Sort:</span>
          {[{k:"spread",l:"Opportunity"},{k:"quality",l:"Quality"},{k:"price",l:"Price"},{k:"name",l:"Name"}].map(s => (
            <button key={s.k} onClick={() => setSortBy(s.k)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium ${sortBy === s.k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{s.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Project List */}
        <div className="col-span-5">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{filtered.length} Projects</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-screen overflow-y-auto">
              {filtered.map(p => {
                const sdgMatch = sdgMatchScore(p);
                const isHeld = portfolio.some(h => h.projectId === p.id);
                return (
                  <div key={p.id} onClick={() => { setSelectedId(p.id); setTab("analysis"); }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${p.id === selectedId ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          {isHeld && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">HELD</span>}
                        </div>
                        <p className="text-xs text-gray-500">{p.methodology} · {p.registry} · {p.country} · {p.vintage}</p>
                      </div>
                      <SignalBadge signal={p.signal} spread={p.spread} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3">
                        <div><p className="text-xs text-gray-400">Market</p><p className="text-sm font-bold">${p.currentPrice}</p></div>
                        <div><p className="text-xs text-gray-400">Fair</p><p className="text-sm font-semibold text-emerald-700">${p.fairValue}</p></div>
                        <div><p className="text-xs text-gray-400">Score</p><p className="text-sm font-semibold">{p.overallScore}</p></div>
                        {sdgMatch !== null && <div><p className="text-xs text-gray-400">SDG</p><p className={`text-sm font-semibold ${sdgMatch >= 50 ? "text-emerald-600" : "text-gray-500"}`}>{sdgMatch}%</p></div>}
                      </div>
                      <MiniSparkline data={p.priceHistory} color={p.spread > 0 ? "#10B981" : p.spread < -8 ? "#EF4444" : "#F59E0B"} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex gap-0.5">
                        {p.sdgs.slice(0, 4).map(s => (
                          <span key={s} className={`text-white text-xs font-bold px-1 py-0 rounded ${profile.preferredSDGs.includes(s) ? "ring-2 ring-blue-400" : ""}`}
                            style={{ backgroundColor: SDG_COLORS[s] || "#666", fontSize: "9px" }}>SDG{s}</span>
                        ))}
                      </div>
                      <DemandBadge demandSignal={p.demandSignal} />
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-sm text-gray-500 p-6 text-center">No projects match your filters.</p>}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-7">
          {selected && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-500">{selected.registry} · {selected.registryId} · {selected.methodology} · V{selected.vintage} · {selected.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SignalBadge signal={selected.signal} spread={selected.spread} />
                  {!inPortfolio ? (
                    <button onClick={() => addToPortfolio(selected)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">+ Portfolio</button>
                  ) : (
                    <span className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg font-medium">In Portfolio</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 mb-3 leading-relaxed">{selected.description}</p>

              <div className="flex gap-0.5 border-b border-gray-200 mb-4">
                {[{ key: "analysis", label: "Pricing" }, { key: "quality", label: "Quality" }, { key: "volume", label: "Supply & Demand" }].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
                ))}
              </div>

              {tab === "analysis" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-1">Price History vs. Your Fair Value (24 months)</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={selected.priceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <defs>
                          <linearGradient id={`grad-${selected.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} tickFormatter={v => `$${v}`} />
                        <Tooltip formatter={(v, n) => [`$${v}`, n === "marketPrice" ? "Market" : "Your Fair Value"]} />
                        <ReferenceLine y={selected.fairValue} stroke="#10B981" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Fair: $${selected.fairValue}`, position: "right", fill: "#10B981", fontSize: 10 }} />
                        <Area type="monotone" dataKey="marketPrice" stroke="#3B82F6" strokeWidth={2} fill={`url(#grad-${selected.id})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-gray-700">Your Fair Value: ${selected.fairValue}/tonne</h4>
                      <div className="flex items-center gap-2">
                        <DemandBadge demandSignal={selected.demandSignal} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selected.momentum > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {selected.momentum > 0 ? "\u2191" : "\u2193"} {Math.abs(selected.momentum)}% momentum
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Base ({selected.methodology}): ${METHOD_BASE[selected.methodology]} × Quality: {(selected.fairValue / METHOD_BASE[selected.methodology] / (selected.vintage >= 2025 ? 1.12 : selected.vintage >= 2024 ? 1.08 : selected.vintage >= 2023 ? 1.0 : 0.92)).toFixed(2)}x × Vintage: {selected.vintage >= 2025 ? 1.12 : selected.vintage >= 2024 ? 1.08 : selected.vintage >= 2023 ? 1.0 : 0.92}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div><p className="text-xs text-gray-500">Market</p><p className="text-lg font-bold">${selected.currentPrice}</p></div>
                      <div className="text-xl text-gray-300">vs.</div>
                      <div><p className="text-xs text-gray-500">Fair Value</p><p className="text-lg font-bold text-emerald-700">${selected.fairValue}</p></div>
                      <div className="text-right"><p className="text-xs text-gray-500">Spread</p>
                        <p className={`text-lg font-bold ${selected.spread > 0 ? "text-emerald-700" : "text-red-600"}`}>{selected.spread > 0 ? "+" : ""}{selected.spread}%</p>
                      </div>
                    </div>
                    {selected.signal === "BUY" && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2 border border-emerald-200"><strong>BUY.</strong> Market price is {Math.abs(selected.spread)}% below your fair value.</p>}
                    {selected.signal === "HOLD" && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-200"><strong>HOLD.</strong> Spread within \u00B18% tolerance.</p>}
                    {selected.signal === "SELL" && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2 border border-red-200"><strong>OVERPRICED.</strong> Market exceeds your fair value by {Math.abs(selected.spread)}%.</p>}
                  </div>
                </div>
              )}
              {tab === "quality" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-1">Quality Radar</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={ATTRIBUTES.map(a => ({ attribute: a.label, score: selected.attributes[a.key], fullMark: 10 }))} cx="50%" cy="50%" outerRadius="68%">
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 9.5, fill: "#374151" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 8 }} />
                        <Radar dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Attributes (Your Weights)</h4>
                    <div className="space-y-2">
                      {ATTRIBUTES.map(a => {
                        const score = selected.attributes[a.key];
                        const w = weights[a.key];
                        const contrib = +((score / 10) * w * 100).toFixed(1);
                        return (
                          <div key={a.key} className="grid grid-cols-12 items-center gap-1.5">
                            <div className="col-span-3"><p className="text-xs font-semibold text-gray-700">{a.label}</p><p className="text-xs text-gray-400">{(w * 100).toFixed(0)}% wt</p></div>
                            <div className="col-span-6"><QualityBar score={score} /></div>
                            <div className="col-span-3 text-right"><span className="text-xs font-mono text-blue-600">{contrib}%</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {tab === "volume" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-1">Issuance vs. Retirement (Demand Signal)</h4>
                    <p className="text-xs text-gray-500 mb-2">High retirement:issuance ratio = strong demand. Retirement rate: <strong>{selected.retirementRate}%</strong></p>
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={selected.priceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                        <YAxis yAxisId="vol" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis yAxisId="trades" orientation="right" tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v, n) => [n === "trades" ? v : v.toLocaleString(), n]} />
                        <Bar yAxisId="vol" dataKey="issuance" fill="#CBD5E1" name="Issued" radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="vol" dataKey="retirement" fill="#3B82F6" name="Retired" radius={[2, 2, 0, 0]} />
                        <Line yAxisId="trades" type="monotone" dataKey="trades" stroke="#F59E0B" strokeWidth={2} dot={false} name="Trades/mo" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: "Total Issued", value: `${(selected.issuedTotal / 1e6).toFixed(2)}M`, sub: "tCO\u2082e" },
                      { label: "Total Retired", value: `${(selected.retiredTotal / 1e6).toFixed(2)}M`, sub: "tCO\u2082e" },
                      { label: "Retirement Rate", value: `${selected.retirementRate}%`, sub: "demand signal" },
                      { label: "Price Momentum", value: `${selected.momentum > 0 ? "+" : ""}${selected.momentum}%`, sub: "3mo vs prior 3mo", color: selected.momentum > 0 ? "text-emerald-700" : "text-red-600" },
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color || "text-gray-900"}`}>{s.value}</p>
                        <p className="text-xs text-gray-400">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: MARKET PRICES
// ═══════════════════════════════════════════════════════════════════════════

function MarketPricesTab({ projects }) {
  const [selectedMeth, setSelectedMeth] = useState("All");

  // Methodology aggregates
  const methStats = useMemo(() => {
    const groups = {};
    for (const p of projects) {
      if (!groups[p.methodology]) groups[p.methodology] = [];
      groups[p.methodology].push(p);
    }
    return Object.entries(groups).map(([meth, projs]) => ({
      methodology: meth,
      count: projs.length,
      avgPrice: +(projs.reduce((s, p) => s + p.currentPrice, 0) / projs.length).toFixed(2),
      avgFairValue: +(projs.reduce((s, p) => s + p.fairValue, 0) / projs.length).toFixed(2),
      avgSpread: +(projs.reduce((s, p) => s + p.spread, 0) / projs.length).toFixed(1),
      avgQuality: +(projs.reduce((s, p) => s + p.overallScore, 0) / projs.length).toFixed(1),
      basePrice: METHOD_BASE[meth],
      avgRetRate: +(projs.reduce((s, p) => s + p.retirementRate, 0) / projs.length).toFixed(0),
      avgMomentum: +(projs.reduce((s, p) => s + p.momentum, 0) / projs.length).toFixed(1),
    })).sort((a, b) => b.avgSpread - a.avgSpread);
  }, [projects]);

  // Filtered projects for price history
  const viewProjects = selectedMeth === "All" ? projects : projects.filter(p => p.methodology === selectedMeth);

  // Spread chart
  const spreadData = [...viewProjects].sort((a, b) => b.spread - a.spread).map(p => ({
    name: p.name.length > 18 ? p.name.substring(0, 16) + "\u2026" : p.name,
    spread: p.spread,
  }));

  // Aggregate price history across methodology
  const aggregatePriceHistory = useMemo(() => {
    if (viewProjects.length === 0) return [];
    const months = viewProjects[0].priceHistory.length;
    const data = [];
    for (let i = 0; i < months; i++) {
      const month = viewProjects[0].priceHistory[i].month;
      const avgPrice = +(viewProjects.reduce((s, p) => s + p.priceHistory[i].marketPrice, 0) / viewProjects.length).toFixed(2);
      const totalIssuance = viewProjects.reduce((s, p) => s + p.priceHistory[i].issuance, 0);
      const totalRetirement = viewProjects.reduce((s, p) => s + p.priceHistory[i].retirement, 0);
      const totalTrades = viewProjects.reduce((s, p) => s + p.priceHistory[i].trades, 0);
      const totalVolume = viewProjects.reduce((s, p) => s + p.priceHistory[i].volume, 0);
      data.push({ month, avgPrice, totalIssuance, totalRetirement, totalTrades, totalVolume, retirementRatio: totalIssuance > 0 ? +((totalRetirement / totalIssuance) * 100).toFixed(0) : 0 });
    }
    return data;
  }, [viewProjects]);

  const buyCount = viewProjects.filter(p => p.signal === "BUY").length;
  const holdCount = viewProjects.filter(p => p.signal === "HOLD").length;
  const sellCount = viewProjects.filter(p => p.signal === "SELL").length;

  return (
    <div className="space-y-4">
      {/* Market Stats */}
      <div className="grid grid-cols-6 gap-2.5">
        {[
          { label: "Projects", value: viewProjects.length, sub: selectedMeth === "All" ? `${METHODOLOGIES.length} methodologies` : selectedMeth },
          { label: "Buy", value: buyCount, sub: "Undervalued", color: "text-emerald-700" },
          { label: "Hold", value: holdCount, sub: "Fair value", color: "text-amber-600" },
          { label: "Overpriced", value: sellCount, sub: "Above fair value", color: "text-red-600" },
          { label: "Avg Spread", value: `${(viewProjects.reduce((s,p)=>s+p.spread,0)/viewProjects.length || 0).toFixed(1)}%`, sub: "vs. your fair values" },
          { label: "Avg Momentum", value: `${(viewProjects.reduce((s,p)=>s+p.momentum,0)/viewProjects.length || 0).toFixed(1)}%`, sub: "3-month trend" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color || "text-gray-900"}`}>{s.value}</p>
            <p className="text-xs text-gray-400 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Methodology Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 font-medium mr-1">View:</span>
        <button onClick={() => setSelectedMeth("All")} className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${selectedMeth === "All" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>All</button>
        {METHODOLOGIES.map(m => (
          <button key={m} onClick={() => setSelectedMeth(m)} className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${selectedMeth === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{m}</button>
        ))}
      </div>

      {/* Price History + Volume */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Average Price History (24 months)" subtitle={selectedMeth === "All" ? "Across all methodologies" : selectedMeth}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={aggregatePriceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v, n) => [`$${v}`, "Avg Price"]} />
              <Area type="monotone" dataKey="avgPrice" stroke="#3B82F6" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Retirement vs. Issuance (Demand Signal)" subtitle="High retirement ratio = strong buyer demand">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={aggregatePriceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="vol" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="ratio" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} domain={[0, 120]} />
              <Tooltip />
              <Bar yAxisId="vol" dataKey="totalIssuance" fill="#CBD5E1" name="Supply (Issued)" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="vol" dataKey="totalRetirement" fill="#3B82F6" name="Demand (Retired)" radius={[2, 2, 0, 0]} />
              <Line yAxisId="ratio" type="monotone" dataKey="retirementRatio" stroke="#F59E0B" strokeWidth={2} dot={false} name="Ret. Ratio %" />
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Spread + Trade Activity */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Market Spread: Fair Value vs. Market Price" subtitle="Positive = undervalued opportunity">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spreadData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1.5} />
              <Tooltip formatter={v => [`${v}%`, "Spread"]} />
              <Bar dataKey="spread" radius={[3, 3, 0, 0]}>
                {spreadData.map((d, i) => <Cell key={i} fill={d.spread > 8 ? "#10B981" : d.spread < -8 ? "#EF4444" : "#F59E0B"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Trade Activity (24 months)" subtitle="Volume and frequency of trading activity">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={aggregatePriceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="vol" tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="trades" orientation="right" tick={{ fontSize: 9 }} />
              <Tooltip />
              <Area yAxisId="vol" type="monotone" dataKey="totalVolume" fill="#E0E7FF" stroke="#6366F1" strokeWidth={1} name="Volume (tonnes)" />
              <Line yAxisId="trades" type="monotone" dataKey="totalTrades" stroke="#F59E0B" strokeWidth={2} dot={false} name="Trades/month" />
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Methodology Table */}
      <SectionCard title="Methodology Summary" subtitle="Aggregated market data by project type">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-gray-500 font-medium">Methodology</th>
              <th className="text-right py-2 text-gray-500 font-medium">#</th>
              <th className="text-right py-2 text-gray-500 font-medium">Base</th>
              <th className="text-right py-2 text-gray-500 font-medium">Avg Market</th>
              <th className="text-right py-2 text-gray-500 font-medium">Avg Fair</th>
              <th className="text-right py-2 text-gray-500 font-medium">Spread</th>
              <th className="text-right py-2 text-gray-500 font-medium">Quality</th>
              <th className="text-right py-2 text-gray-500 font-medium">Ret. Rate</th>
              <th className="text-right py-2 text-gray-500 font-medium">Momentum</th>
            </tr>
          </thead>
          <tbody>
            {methStats.map(m => (
              <tr key={m.methodology} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedMeth(m.methodology)}>
                <td className="py-2.5 font-medium text-gray-800">{m.methodology}</td>
                <td className="py-2.5 text-right text-gray-600">{m.count}</td>
                <td className="py-2.5 text-right font-mono text-gray-500">${m.basePrice}</td>
                <td className="py-2.5 text-right font-mono">${m.avgPrice}</td>
                <td className="py-2.5 text-right font-mono text-blue-600">${m.avgFairValue}</td>
                <td className={`py-2.5 text-right font-bold ${m.avgSpread > 0 ? "text-emerald-600" : "text-red-600"}`}>{m.avgSpread > 0 ? "+" : ""}{m.avgSpread}%</td>
                <td className="py-2.5 text-right font-mono">{m.avgQuality}</td>
                <td className="py-2.5 text-right font-mono">{m.avgRetRate}%</td>
                <td className={`py-2.5 text-right font-medium ${parseFloat(m.avgMomentum) > 0 ? "text-emerald-600" : "text-red-600"}`}>{m.avgMomentum > 0 ? "+" : ""}{m.avgMomentum}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: PORTFOLIO
// ═══════════════════════════════════════════════════════════════════════════

function PortfolioTab({ portfolio, setPortfolio, projects, profile }) {
  const holdings = portfolio.map(h => {
    const proj = projects.find(p => p.id === h.projectId);
    if (!proj) return null;
    const marketValue = h.quantity * proj.currentPrice;
    const costBasis = h.quantity * h.purchasePrice;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? ((pnl / costBasis) * 100).toFixed(1) : "0";
    return { ...h, project: proj, marketValue, costBasis, pnl, pnlPct };
  }).filter(Boolean);

  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalMarketValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalPnL = totalMarketValue - totalCost;
  const totalTonnes = holdings.reduce((s, h) => s + h.quantity, 0);
  const blendedQuality = holdings.length > 0 ? (holdings.reduce((s, h) => s + h.project.overallScore * h.quantity, 0) / totalTonnes).toFixed(1) : 0;
  const volumeProgress = profile.volumeTarget > 0 ? ((totalTonnes / profile.volumeTarget) * 100).toFixed(0) : 0;

  const updateQuantity = (projectId, qty) => setPortfolio(prev => prev.map(h => h.projectId === projectId ? { ...h, quantity: Math.max(0, qty) } : h));
  const removeHolding = (projectId) => setPortfolio(prev => prev.filter(h => h.projectId !== projectId));

  const methDist = {};
  for (const h of holdings) methDist[h.project.methodology] = (methDist[h.project.methodology] || 0) + h.quantity;
  const pieData = Object.entries(methDist).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"];

  const overpriced = holdings.filter(h => h.project.signal === "SELL");
  const undervalued = holdings.filter(h => h.project.signal === "BUY");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2.5">
        {[
          { label: "Holdings", value: holdings.length, sub: "projects" },
          { label: "Total Tonnes", value: totalTonnes.toLocaleString(), sub: `${volumeProgress}% of target` },
          { label: "Cost Basis", value: `$${totalCost.toLocaleString()}`, sub: `$${totalTonnes > 0 ? (totalCost / totalTonnes).toFixed(2) : 0}/t` },
          { label: "Market Value", value: `$${totalMarketValue.toLocaleString()}`, sub: `$${totalTonnes > 0 ? (totalMarketValue / totalTonnes).toFixed(2) : 0}/t` },
          { label: "P&L", value: `${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toLocaleString()}`, sub: `${totalCost > 0 ? ((totalPnL / totalCost) * 100).toFixed(1) : 0}%`, color: totalPnL >= 0 ? "text-emerald-700" : "text-red-600" },
          { label: "Quality", value: blendedQuality, sub: "blended score" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.color || "text-gray-900"}`}>{s.value}</p>
            <p className="text-xs text-gray-400 truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {profile.volumeTarget > 0 && (
        <SectionCard title="Volume Target Progress">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${parseFloat(volumeProgress) >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(parseFloat(volumeProgress), 100)}%` }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">{totalTonnes.toLocaleString()} / {profile.volumeTarget.toLocaleString()} tCO&#8322;e</p>
              <p className="text-xs text-gray-500">{Math.max(0, profile.volumeTarget - totalTonnes).toLocaleString()} remaining</p>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SectionCard title="Holdings" subtitle="Manage your carbon credit portfolio">
            {holdings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-2">No holdings yet</p>
                <p className="text-gray-400 text-xs">Go to Project Evaluation to add projects.</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">Project</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Qty (t)</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Bought @</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Market</th>
                    <th className="text-right py-2 text-gray-500 font-medium">P&L</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Signal</th>
                    <th className="text-right py-2 text-gray-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.projectId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5"><p className="font-medium text-gray-800">{h.project.name}</p><p className="text-gray-400">{h.project.methodology} · {h.project.country}</p></td>
                      <td className="py-2.5 text-right">
                        <input type="number" value={h.quantity} onChange={e => updateQuantity(h.projectId, parseInt(e.target.value) || 0)}
                          className="w-20 text-right text-xs border border-gray-300 rounded px-2 py-1" />
                      </td>
                      <td className="py-2.5 text-right font-mono">${h.purchasePrice.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono">${h.project.currentPrice.toFixed(2)}</td>
                      <td className={`py-2.5 text-right font-bold ${h.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>{h.pnl >= 0 ? "+" : ""}${Math.abs(h.pnl).toLocaleString()} ({h.pnlPct}%)</td>
                      <td className="py-2.5 text-right"><SignalBadge signal={h.project.signal} spread={h.project.spread} /></td>
                      <td className="py-2.5 text-right"><button onClick={() => removeHolding(h.projectId)} className="text-red-400 hover:text-red-600 text-xs">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Composition" subtitle="By methodology">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }} fontSize={9}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => `${v.toLocaleString()} t`} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-xs text-center py-8">Add holdings to see</p>}
          </SectionCard>

          {overpriced.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-800 font-bold mb-1">Sell Recommendations</p>
              {overpriced.map(h => <p key={h.projectId} className="text-xs text-red-700">{h.project.name}: {h.project.spread}% overpriced. Consider selling and reallocating.</p>)}
            </div>
          )}
          {undervalued.length > 0 && (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-800 font-bold mb-1">Strong Holds</p>
              {undervalued.map(h => <p key={h.projectId} className="text-xs text-emerald-700">{h.project.name}: +{h.project.spread}% undervalued. Good position.</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: PROCUREMENT BRIEF
// ═══════════════════════════════════════════════════════════════════════════

function ProcurementBriefTab({ profile, portfolio, projects, weights }) {
  const holdings = portfolio.map(h => {
    const proj = projects.find(p => p.id === h.projectId);
    if (!proj) return null;
    return { ...h, project: proj };
  }).filter(Boolean);

  const totalTonnes = holdings.reduce((s, h) => s + h.quantity, 0);
  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.project.currentPrice, 0);
  const blendedPrice = totalTonnes > 0 ? (totalCost / totalTonnes).toFixed(2) : 0;
  const blendedQuality = totalTonnes > 0 ? (holdings.reduce((s, h) => s + h.project.overallScore * h.quantity, 0) / totalTonnes).toFixed(1) : 0;
  const avgSpread = holdings.length > 0 ? (holdings.reduce((s, h) => s + h.project.spread, 0) / holdings.length).toFixed(1) : 0;

  const sdgSet = new Set();
  for (const h of holdings) h.project.sdgs.forEach(s => sdgSet.add(s));
  const coveredSDGs = [...sdgSet].sort((a, b) => a - b);
  const sdgAlignmentPct = profile.preferredSDGs.length > 0 ? ((profile.preferredSDGs.filter(s => sdgSet.has(s)).length / profile.preferredSDGs.length) * 100).toFixed(0) : 100;
  const regionSet = new Set(); for (const h of holdings) regionSet.add(h.project.region);
  const coveredRegions = [...regionSet];
  const topWeights = [...ATTRIBUTES].sort((a, b) => weights[b.key] - weights[a.key]).slice(0, 3);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Market context: top opportunities they're NOT holding
  const notHeld = projects.filter(p => !portfolio.some(h => h.projectId === p.id)).filter(p => p.signal === "BUY").sort((a, b) => b.spread - a.spread).slice(0, 3);

  const copyBrief = () => {
    let t = `CARBON CREDIT PROCUREMENT BRIEF\nPrepared for: ${profile.companyName || "\u2014"} | ${today}\nIndustry: ${profile.industry || "\u2014"} | Framework: ${profile.complianceFramework || "\u2014"}\n\n`;
    t += `EXECUTIVE SUMMARY\nBased on ${profile.companyName || "your organization"}'s quality priorities \u2014 emphasizing ${topWeights.map(w => w.label.toLowerCase()).join(", ")} \u2014 we recommend a portfolio of ${holdings.length} carbon credit projects totaling ${totalTonnes.toLocaleString()} tCO\u2082e at a blended cost of $${blendedPrice}/tonne ($${totalCost.toLocaleString()} total). This portfolio achieves a weighted quality score of ${blendedQuality}/10 and represents an average ${avgSpread}% spread vs. fair value.\n\n`;
    t += `RECOMMENDED PORTFOLIO\n`;
    for (const h of holdings) t += `\u2022 ${h.project.name} \u2014 ${h.quantity.toLocaleString()} tonnes @ $${h.project.currentPrice}/t | ${h.project.signal} (${h.project.spread > 0 ? "+" : ""}${h.project.spread}%) | Quality: ${h.project.overallScore}/10\n`;
    t += `\nTotal: ${totalTonnes.toLocaleString()} tCO\u2082e | $${totalCost.toLocaleString()} | $${blendedPrice}/t blended\n\n`;
    t += `SDG COVERAGE: ${coveredSDGs.map(s => `SDG ${s} (${SDG_LABELS[s]})`).join(", ")}\nAlignment with priorities: ${sdgAlignmentPct}%\n\n`;
    t += `GEOGRAPHIC DISTRIBUTION: ${coveredRegions.join(", ")}\n\n`;
    if (notHeld.length > 0) { t += `ADDITIONAL OPPORTUNITIES\n`; for (const p of notHeld) t += `\u2022 ${p.name} (${p.methodology}) \u2014 +${p.spread}% undervalued, Quality: ${p.overallScore}/10\n`; t += "\n"; }
    t += `RISK CONSIDERATIONS\n`;
    const permRisk = holdings.filter(h => h.project.attributes.permanence <= 5);
    const addRisk = holdings.filter(h => h.project.attributes.additionality <= 5);
    const sellRisk = holdings.filter(h => h.project.signal === "SELL");
    if (permRisk.length) t += `\u2022 Permanence Risk: ${permRisk.map(h => h.project.name).join(", ")}\n`;
    if (addRisk.length) t += `\u2022 Additionality Concern: ${addRisk.map(h => h.project.name).join(", ")}\n`;
    if (sellRisk.length) t += `\u2022 Overpriced: ${sellRisk.map(h => h.project.name).join(", ")}\n`;
    if (!permRisk.length && !addRisk.length && !sellRisk.length) t += `\u2022 No major risk flags identified.\n`;
    t += `\n\u2014\nCarbon Market Intelligence Platform | ${today} | All pricing based on attribute-weighted fair value model.`;
    navigator.clipboard.writeText(t).catch(() => {});
  };

  if (holdings.length === 0) {
    return (
      <SectionCard title="Procurement Brief" subtitle="Build your portfolio first">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No holdings in portfolio yet.</p>
          <p className="text-gray-400 text-xs">Set your Buyer Profile, evaluate projects, add them to your portfolio, then return here.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Brief Header */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Carbon Market Intelligence</p>
              <h1 className="text-xl font-bold text-gray-900">Procurement Brief</h1>
              <p className="text-sm text-gray-500 mt-1">Prepared for {profile.companyName || "\u2014"} · {today}</p>
              <p className="text-xs text-gray-400 mt-0.5">{profile.industry || "\u2014"} · {profile.complianceFramework || "\u2014"}</p>
            </div>
            <button onClick={copyBrief} className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Copy Full Brief</button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Executive Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Based on {profile.companyName || "your organization"}&apos;s quality priorities — emphasizing <strong>{topWeights[0]?.label.toLowerCase()}</strong>, <strong>{topWeights[1]?.label.toLowerCase()}</strong>, and <strong>{topWeights[2]?.label.toLowerCase()}</strong> — we recommend a diversified portfolio of <strong>{holdings.length} carbon credit project{holdings.length > 1 ? "s" : ""}</strong> across <strong>{coveredRegions.length} geographic region{coveredRegions.length > 1 ? "s" : ""}</strong> and <strong>{new Set(holdings.map(h => h.project.methodology)).size} methodology type{new Set(holdings.map(h => h.project.methodology)).size > 1 ? "s" : ""}</strong>.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            The portfolio totals <strong>{totalTonnes.toLocaleString()} tCO&#8322;e</strong> at a blended cost of <strong>${blendedPrice}/tonne</strong> (${totalCost.toLocaleString()} total
            {profile.volumeTarget > 0 ? `, covering ${((totalTonnes / profile.volumeTarget) * 100).toFixed(0)}% of your ${profile.volumeTarget.toLocaleString()} tonne annual target` : ""}
            ). The portfolio achieves a quality-weighted score of <strong>{blendedQuality}/10</strong> and represents an average <strong>{parseFloat(avgSpread) > 0 ? "+" : ""}{avgSpread}% spread</strong> versus fair value — {parseFloat(avgSpread) > 0 ? "indicating favorable pricing below our quality-adjusted valuation" : "reflecting a modest premium for high-quality credits"}.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            This portfolio addresses <strong>{coveredSDGs.length} of the 17 UN Sustainable Development Goals</strong>{profile.preferredSDGs.length > 0 ? `, with ${sdgAlignmentPct}% alignment to your ${profile.preferredSDGs.length} priority SDGs` : ""}.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Total Volume", value: `${totalTonnes.toLocaleString()}t`, sub: profile.volumeTarget > 0 ? `${((totalTonnes / profile.volumeTarget) * 100).toFixed(0)}% of target` : "" },
              { label: "Total Cost", value: `$${totalCost.toLocaleString()}`, sub: `$${blendedPrice}/t blended` },
              { label: "Quality Score", value: `${blendedQuality}/10`, sub: "weighted average" },
              { label: "Avg Spread", value: `${parseFloat(avgSpread) > 0 ? "+" : ""}${avgSpread}%`, sub: "vs. fair value", color: parseFloat(avgSpread) > 0 ? "text-emerald-700" : "text-red-600" },
              { label: "SDG Alignment", value: `${sdgAlignmentPct}%`, sub: `${coveredSDGs.length} SDGs` },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.color || "text-gray-900"}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Portfolio Widget */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Recommended Portfolio</h2>
          <div className="space-y-2">
            {holdings.map((h, idx) => (
              <div key={h.projectId} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{h.project.name}</p>
                    <SignalBadge signal={h.project.signal} spread={h.project.spread} />
                  </div>
                  <p className="text-xs text-gray-500">{h.project.methodology} · {h.project.registry} · {h.project.country} · V{h.project.vintage}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold">{h.quantity.toLocaleString()} t</p>
                  <p className="text-xs text-gray-500">@ ${h.project.currentPrice}/t</p>
                </div>
                <div className="text-right flex-shrink-0 w-20">
                  <p className="text-sm font-bold">${(h.quantity * h.project.currentPrice).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{((h.quantity / totalTonnes) * 100).toFixed(0)}% of portfolio</p>
                </div>
                <div className="text-right flex-shrink-0 w-12">
                  <p className="text-sm font-bold">{h.project.overallScore}</p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm font-bold text-blue-900">Portfolio Total</p>
            <div className="flex items-center gap-6">
              <p className="text-sm font-bold text-blue-900">{totalTonnes.toLocaleString()} tCO&#8322;e</p>
              <p className="text-sm font-bold text-blue-900">${totalCost.toLocaleString()}</p>
              <p className="text-sm font-bold text-blue-900">${blendedPrice}/t avg</p>
              <p className="text-sm font-bold text-blue-900">{blendedQuality}/10 quality</p>
            </div>
          </div>
        </div>

        {/* Narrative: Why These Projects */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Rationale</h2>
          {holdings.map(h => (
            <div key={h.projectId} className="mb-4 last:mb-0">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>{h.project.name}</strong> ({h.project.methodology}, {h.project.country}) — Allocated {h.quantity.toLocaleString()} tonnes at ${h.project.currentPrice}/tonne. This project
                {h.project.signal === "BUY" ? ` trades at a ${Math.abs(h.project.spread)}% discount to our quality-adjusted fair value of $${h.project.fairValue}, representing a buying opportunity` : h.project.signal === "HOLD" ? ` trades near fair value ($${h.project.fairValue}), offering stable positioning` : ` trades at a ${Math.abs(h.project.spread)}% premium to fair value ($${h.project.fairValue}), but may offer strategic value`}.
                {h.project.demandSignal === "Strong" ? " Strong demand signal based on high retirement-to-issuance ratio." : ""}
                {h.project.overallScore >= 7 ? ` Quality score of ${h.project.overallScore}/10 reflects strong fundamentals across your priority attributes.` : ` Quality score of ${h.project.overallScore}/10 — consider monitoring closely.`}
                {" "}Registered with {h.project.registry} ({h.project.registryId}).
              </p>
            </div>
          ))}
        </div>

        {/* SDG & Geography */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Impact & Geography</h2>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">SDG Coverage</p>
            <div className="flex flex-wrap gap-2">
              {coveredSDGs.map(s => (
                <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs font-bold ${profile.preferredSDGs.includes(s) ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                  style={{ backgroundColor: SDG_COLORS[s] }}>SDG {s}: {SDG_LABELS[s]}</div>
              ))}
            </div>
            {profile.preferredSDGs.filter(s => !sdgSet.has(s)).length > 0 && (
              <p className="text-xs text-amber-700 mt-2">Gap: Priority SDG{profile.preferredSDGs.filter(s => !sdgSet.has(s)).length > 1 ? "s" : ""} {profile.preferredSDGs.filter(s => !sdgSet.has(s)).map(s => `${s} (${SDG_LABELS[s]})`).join(", ")} not covered.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Geographic Distribution</p>
            <p className="text-sm text-gray-700">{coveredRegions.join(", ")} ({coveredRegions.length} region{coveredRegions.length > 1 ? "s" : ""})</p>
          </div>
        </div>

        {/* Additional Opportunities */}
        {notHeld.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Additional Opportunities</h2>
            <p className="text-sm text-gray-600 mb-3">Projects not yet in your portfolio that show strong buy signals based on your quality priorities:</p>
            {notHeld.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.methodology} · {p.country} · Score: {p.overallScore}/10</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono">${p.currentPrice}/t</p>
                  <SignalBadge signal={p.signal} spread={p.spread} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Risk Assessment */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Risk Assessment</h2>
          <div className="space-y-2">
            {holdings.filter(h => h.project.attributes.permanence <= 5).length > 0 && (
              <p className="text-sm text-gray-700 leading-relaxed"><strong className="text-amber-700">Permanence Risk:</strong> {holdings.filter(h => h.project.attributes.permanence <= 5).map(h => h.project.name).join(", ")} have permanence scores ≤5/10, indicating elevated reversal risk. Consider pairing with high-permanence credits (DAC, Biochar) for portfolio balance.</p>
            )}
            {holdings.filter(h => h.project.attributes.additionality <= 5).length > 0 && (
              <p className="text-sm text-gray-700 leading-relaxed"><strong className="text-amber-700">Additionality Concern:</strong> {holdings.filter(h => h.project.attributes.additionality <= 5).map(h => h.project.name).join(", ")} may face scrutiny on whether emissions reductions are truly additional. Monitor regulatory developments.</p>
            )}
            {holdings.filter(h => h.project.signal === "SELL").length > 0 && (
              <p className="text-sm text-gray-700 leading-relaxed"><strong className="text-red-700">Pricing Alert:</strong> {holdings.filter(h => h.project.signal === "SELL").map(h => h.project.name).join(", ")} currently trade above your quality-adjusted fair value. Consider timing entry or evaluating alternatives.</p>
            )}
            {holdings.filter(h => h.project.attributes.permanence <= 5).length === 0 && holdings.filter(h => h.project.attributes.additionality <= 5).length === 0 && holdings.filter(h => h.project.signal === "SELL").length === 0 && (
              <p className="text-sm text-emerald-700 leading-relaxed"><strong>Low Risk Portfolio:</strong> No major risk flags identified. All holdings are fairly priced or undervalued with adequate quality scores across all dimensions.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-400 text-center">Carbon Market Intelligence Platform · Procurement Brief · {today}</p>
          <p className="text-xs text-gray-400 text-center mt-0.5">Pricing model: 8-attribute quality weighting × methodology base price × vintage adjustment. Buy/Sell signals at ±8% spread threshold. All market data simulated for demonstration.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function CarbonDashboard() {
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({
    companyName: "",
    industry: "",
    complianceFramework: "",
    volumeTarget: 50000,
    maxPricePerTonne: 25,
    preferredRegions: [],
    preferredMethodologies: [],
    preferredSDGs: [],
    rawWeights: Object.fromEntries(ATTRIBUTES.map(a => [a.key, Math.round(DEFAULT_WEIGHTS[a.key] * 50)])),
  });

  const weights = useMemo(() => {
    const raw = profile.rawWeights;
    const total = Object.values(raw).reduce((s, v) => s + v, 0);
    if (total === 0) return DEFAULT_WEIGHTS;
    const n = {};
    for (const k of Object.keys(raw)) n[k] = +(raw[k] / total).toFixed(4);
    return n;
  }, [profile.rawWeights]);

  const projects = useMemo(() => enrichProjects(weights), [weights]);
  const [portfolio, setPortfolio] = useState([]);

  const TABS = [
    { key: "profile", label: "Buyer Profile" },
    { key: "evaluate", label: "Project Evaluation" },
    { key: "prices", label: "Market Prices" },
    { key: "portfolio", label: "Portfolio", badge: portfolio.length || null },
    { key: "brief", label: "Procurement Brief" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Carbon Market Intelligence</h1>
            <p className="text-xs text-gray-500">{projects.length} projects · 10 methodologies · {profile.companyName ? `${profile.companyName}` : "Configure your Buyer Profile to get started"}</p>
          </div>
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`relative px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t.label}
                {t.badge && (
                  <span className={`absolute -top-1 -right-1 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold ${activeTab === t.key ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {activeTab === "profile" && <BuyerProfileTab profile={profile} setProfile={setProfile} weights={weights} projects={projects} />}
        {activeTab === "evaluate" && <ProjectEvaluationTab projects={projects} profile={profile} weights={weights} portfolio={portfolio} setPortfolio={setPortfolio} />}
        {activeTab === "prices" && <MarketPricesTab projects={projects} />}
        {activeTab === "portfolio" && <PortfolioTab portfolio={portfolio} setPortfolio={setPortfolio} projects={projects} profile={profile} />}
        {activeTab === "brief" && <ProcurementBriefTab profile={profile} portfolio={portfolio} projects={projects} weights={weights} />}

        <div className="mt-6 pt-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Carbon Market Intelligence Platform · V2 · {projects.length} Projects · Simulated Data · SFE Spring 2026</p>
        </div>
      </div>
    </div>
  );
}
