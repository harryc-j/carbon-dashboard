"use client";
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell, ReferenceLine, CartesianGrid, Area, AreaChart
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// DATA MODEL & PRICING ENGINE
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

const WEIGHTS = { permanence: 0.20, additionality: 0.18, leakageRisk: 0.12, verificationQuality: 0.12, coBenefits: 0.08, methodologyMaturity: 0.10, bufferAdequacy: 0.10, regulatoryAlignment: 0.10 };
const METHOD_BASE = { "REDD+": 9.0, "Cookstove": 14.0, "Renewable Energy": 4.5, "Blue Carbon": 22.0, "Direct Air Capture": 180.0, "Afforestation": 12.0, "Methane Capture": 8.0, "Biochar": 95.0, "Energy Efficiency": 6.0, "Soil Carbon": 18.0 };
const SDG_COLORS = { 1:"#E5243B", 2:"#DDA63A", 3:"#4C9F38", 4:"#C5192D", 5:"#FF3A21", 6:"#26BDE2", 7:"#FCC30B", 8:"#A21942", 9:"#FD6925", 10:"#DD1367", 11:"#FD9D24", 12:"#BF8B2E", 13:"#3F7E44", 14:"#0A97D9", 15:"#56C02B" };

const METHODOLOGIES = Object.keys(METHOD_BASE);
const REGISTRIES = ["Verra", "Gold Standard", "ACR", "CAR"];
const REGIONS = ["Southeast Asia", "East Africa", "West Africa", "South Asia", "Latin America", "Europe", "North America", "Central Africa", "Oceania"];

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function calculateFairValue(project) {
  let ws = 0;
  for (const a of ATTRIBUTES) ws += (project.attributes[a.key] / 10) * WEIGHTS[a.key];
  const qm = 0.5 + ws * 1.3;
  const va = project.vintage >= 2025 ? 1.12 : project.vintage >= 2024 ? 1.08 : project.vintage >= 2023 ? 1.0 : 0.92;
  return +(METHOD_BASE[project.methodology] * qm * va).toFixed(2);
}

function generatePriceHistory(fairValue, volatility, trend, seed) {
  const rng = seededRandom(seed);
  const data = [];
  const start = new Date(2024, 9);
  let price = fairValue * (0.82 + rng() * 0.2);
  for (let i = 0; i < 18; i++) {
    const d = new Date(start); d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    price += (rng() - 0.48) * volatility * fairValue + trend * fairValue * 0.01;
    price = Math.max(fairValue * 0.4, price);
    data.push({
      month: label,
      marketPrice: +price.toFixed(2),
      fairValue: +fairValue.toFixed(2),
      issuance: Math.floor(5000 + rng() * 45000),
      retirement: Math.floor(3000 + rng() * 35000),
    });
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 25 PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

const RAW_PROJECTS = [
  // ── REDD+ ────────────────────────────────────────────────────────────────
  { id:1, name:"Katingan Peatland Restoration", registry:"Verra", registryId:"VCS-1477", methodology:"REDD+", vintage:2024, country:"Indonesia", region:"Southeast Asia", sdgs:[13,15,6,1], issuedTotal:2450000, retiredTotal:1180000, description:"Protects 149,800 ha of tropical peat swamp forest on Borneo from palm oil conversion. Deep peat deposits at significant fire risk. One of the largest REDD+ projects globally.", attributes:{permanence:6,additionality:7,leakageRisk:5,verificationQuality:8,coBenefits:9,methodologyMaturity:8,bufferAdequacy:6,regulatoryAlignment:7}, volatility:0.06, trend:0.3 },
  { id:2, name:"Mai Ndombe REDD+", registry:"Verra", registryId:"VCS-0934", methodology:"REDD+", vintage:2023, country:"DR Congo", region:"Central Africa", sdgs:[13,15,1,2], issuedTotal:3200000, retiredTotal:980000, description:"Protects 300,000 ha of tropical forest in the DRC\u2019s Mai Ndombe province. High deforestation baseline driven by slash-and-burn agriculture. Significant governance challenges.", attributes:{permanence:5,additionality:6,leakageRisk:4,verificationQuality:6,coBenefits:8,methodologyMaturity:8,bufferAdequacy:5,regulatoryAlignment:5}, volatility:0.09, trend:-0.3 },
  { id:3, name:"Cordillera Azul National Park", registry:"Verra", registryId:"VCS-0985", methodology:"REDD+", vintage:2024, country:"Peru", region:"Latin America", sdgs:[13,15,1], issuedTotal:4100000, retiredTotal:2300000, description:"Protects 1.35M ha of Andean-Amazon transition forest in Peru. High biodiversity. Subject to recent scrutiny over baseline methodology and additionality claims.", attributes:{permanence:7,additionality:5,leakageRisk:5,verificationQuality:7,coBenefits:9,methodologyMaturity:8,bufferAdequacy:6,regulatoryAlignment:6}, volatility:0.08, trend:-0.1 },
  { id:4, name:"Kariba REDD+ Forest Protection", registry:"Verra", registryId:"VCS-0902", methodology:"REDD+", vintage:2023, country:"Zimbabwe", region:"East Africa", sdgs:[13,15,1,8], issuedTotal:1900000, retiredTotal:1400000, description:"Protects nearly 785,000 ha of forest and wildlife habitat on the southern shore of Lake Kariba. Community-based conservation model with revenue-sharing agreements.", attributes:{permanence:6,additionality:7,leakageRisk:6,verificationQuality:7,coBenefits:8,methodologyMaturity:8,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.05, trend:0.2 },

  // ── COOKSTOVE ────────────────────────────────────────────────────────────
  { id:5, name:"Mombasa Clean Cookstoves", registry:"Gold Standard", registryId:"GS-4821", methodology:"Cookstove", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[7,3,5,13], issuedTotal:380000, retiredTotal:290000, description:"Distributes fuel-efficient cookstoves to 45,000 households in coastal Kenya, reducing fuelwood consumption by ~60%. Strong health co-benefits through reduced indoor air pollution.", attributes:{permanence:4,additionality:8,leakageRisk:8,verificationQuality:9,coBenefits:10,methodologyMaturity:9,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.05, trend:0.5 },
  { id:6, name:"Rwanda Improved Stoves Project", registry:"Gold Standard", registryId:"GS-5102", methodology:"Cookstove", vintage:2024, country:"Rwanda", region:"East Africa", sdgs:[7,3,5,13,1], issuedTotal:210000, retiredTotal:175000, description:"Government-backed clean cooking initiative distributing 30,000 improved biomass stoves across rural Rwanda. Strong monitoring infrastructure and high adoption rates.", attributes:{permanence:4,additionality:9,leakageRisk:8,verificationQuality:9,coBenefits:10,methodologyMaturity:9,bufferAdequacy:5,regulatoryAlignment:7}, volatility:0.04, trend:0.6 },
  { id:7, name:"Ghana LPG Transition", registry:"Gold Standard", registryId:"GS-3890", methodology:"Cookstove", vintage:2023, country:"Ghana", region:"West Africa", sdgs:[7,3,13], issuedTotal:150000, retiredTotal:88000, description:"Facilitates transition from charcoal to LPG cooking across 20,000 urban households in Accra and Kumasi. Lower co-benefits than biomass stove projects but higher emissions reductions per household.", attributes:{permanence:4,additionality:7,leakageRisk:7,verificationQuality:8,coBenefits:7,methodologyMaturity:8,bufferAdequacy:4,regulatoryAlignment:5}, volatility:0.06, trend:0.1 },

  // ── RENEWABLE ENERGY ─────────────────────────────────────────────────────
  { id:8, name:"Gujarat Wind Farm Cluster", registry:"Verra", registryId:"VCS-2103", methodology:"Renewable Energy", vintage:2023, country:"India", region:"South Asia", sdgs:[7,13,8], issuedTotal:1800000, retiredTotal:1100000, description:"12 wind turbine installations across Gujarat generating 180MW of clean energy. Displaces coal-fired grid electricity. Additionality increasingly questioned as renewable economics improve.", attributes:{permanence:9,additionality:4,leakageRisk:9,verificationQuality:7,coBenefits:5,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:8}, volatility:0.04, trend:-0.2 },
  { id:9, name:"Oaxaca Solar Array", registry:"CAR", registryId:"CAR-MX-401", methodology:"Renewable Energy", vintage:2024, country:"Mexico", region:"Latin America", sdgs:[7,13,8,11], issuedTotal:420000, retiredTotal:310000, description:"50MW utility-scale solar installation in Oaxaca providing clean electricity to ~120,000 households. Grid displacement factor verified against CFE marginal emissions.", attributes:{permanence:9,additionality:5,leakageRisk:9,verificationQuality:8,coBenefits:6,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:7}, volatility:0.03, trend:0.0 },
  { id:10, name:"Vietnam Mekong Small Hydro", registry:"Verra", registryId:"VCS-1890", methodology:"Renewable Energy", vintage:2022, country:"Vietnam", region:"Southeast Asia", sdgs:[7,13,6], issuedTotal:680000, retiredTotal:520000, description:"Network of 8 small-scale run-of-river hydroelectric stations in the Mekong Delta. Low environmental impact design. Older vintage with declining additionality claims.", attributes:{permanence:9,additionality:3,leakageRisk:8,verificationQuality:6,coBenefits:4,methodologyMaturity:10,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.05, trend:-0.4 },
  { id:11, name:"Morocco Concentrated Solar", registry:"Gold Standard", registryId:"GS-6201", methodology:"Renewable Energy", vintage:2025, country:"Morocco", region:"North Africa", sdgs:[7,13,9], issuedTotal:280000, retiredTotal:95000, description:"Concentrated solar power (CSP) plant near Ouarzazate with thermal storage enabling 24-hour clean generation. Cutting-edge technology with strong grid displacement.", attributes:{permanence:9,additionality:7,leakageRisk:9,verificationQuality:9,coBenefits:6,methodologyMaturity:7,bufferAdequacy:8,regulatoryAlignment:9}, volatility:0.04, trend:0.5 },

  // ── BLUE CARBON ──────────────────────────────────────────────────────────
  { id:12, name:"Cispat\u00e1 Bay Mangrove Conservation", registry:"Verra", registryId:"VCS-2290", methodology:"Blue Carbon", vintage:2024, country:"Colombia", region:"Latin America", sdgs:[14,13,15,1], issuedTotal:85000, retiredTotal:42000, description:"Protects 11,000 ha of mangrove forest along Colombia\u2019s Caribbean coast. Mangroves store 3\u20135x more carbon per hectare than terrestrial forests. Community-managed with strong biodiversity co-benefits.", attributes:{permanence:7,additionality:8,leakageRisk:7,verificationQuality:8,coBenefits:9,methodologyMaturity:6,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.07, trend:0.8 },
  { id:13, name:"Mikoko Pamoja Mangrove", registry:"Gold Standard", registryId:"GS-2091", methodology:"Blue Carbon", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[14,13,1,4], issuedTotal:45000, retiredTotal:38000, description:"Community-led mangrove conservation in Gazi Bay, Kenya. Revenues fund local schools and water infrastructure. Pioneering blue carbon methodology with global attention.", attributes:{permanence:7,additionality:9,leakageRisk:7,verificationQuality:9,coBenefits:10,methodologyMaturity:6,bufferAdequacy:6,regulatoryAlignment:7}, volatility:0.06, trend:1.0 },
  { id:14, name:"Philippines Seagrass Restoration", registry:"Verra", registryId:"VCS-2450", methodology:"Blue Carbon", vintage:2025, country:"Philippines", region:"Southeast Asia", sdgs:[14,13,15], issuedTotal:22000, retiredTotal:8000, description:"Seagrass meadow restoration across 3,000 ha in Palawan. Newer methodology with less established baselines. High biodiversity value but permanence challenges from coastal development.", attributes:{permanence:5,additionality:7,leakageRisk:5,verificationQuality:7,coBenefits:8,methodologyMaturity:4,bufferAdequacy:5,regulatoryAlignment:5}, volatility:0.09, trend:0.3 },

  // ── DIRECT AIR CAPTURE ───────────────────────────────────────────────────
  { id:15, name:"Climeworks Mammoth DAC", registry:"Verra", registryId:"VCS-3010", methodology:"Direct Air Capture", vintage:2025, country:"Iceland", region:"Europe", sdgs:[13,9], issuedTotal:12000, retiredTotal:9500, description:"Direct air capture facility in Hellishei\u00F0i, Iceland. Captures CO\u2082 from ambient air and mineralizes it in basalt for permanent geological storage. Highest permanence (1,000+ years). High cost but rapidly declining.", attributes:{permanence:10,additionality:10,leakageRisk:10,verificationQuality:9,coBenefits:3,methodologyMaturity:5,bufferAdequacy:10,regulatoryAlignment:9}, volatility:0.08, trend:-0.5 },
  { id:16, name:"Carbon Engineering Texas Hub", registry:"ACR", registryId:"ACR-DAC-102", methodology:"Direct Air Capture", vintage:2025, country:"United States", region:"North America", sdgs:[13,9,8], issuedTotal:8000, retiredTotal:7200, description:"Oxy-backed DAC facility in the Permian Basin using geothermal-powered fans and deep geological storage. Largest planned DAC deployment in North America.", attributes:{permanence:10,additionality:10,leakageRisk:10,verificationQuality:8,coBenefits:4,methodologyMaturity:5,bufferAdequacy:10,regulatoryAlignment:10}, volatility:0.07, trend:-0.3 },

  // ── AFFORESTATION ────────────────────────────────────────────────────────
  { id:17, name:"Ethiopia Great Green Wall", registry:"Gold Standard", registryId:"GS-5890", methodology:"Afforestation", vintage:2024, country:"Ethiopia", region:"East Africa", sdgs:[15,13,1,2], issuedTotal:320000, retiredTotal:140000, description:"Reforestation of 25,000 ha of degraded dryland in the Tigray region. Part of the pan-African Great Green Wall initiative. Strong community employment but permanence uncertain in arid climate.", attributes:{permanence:5,additionality:8,leakageRisk:6,verificationQuality:7,coBenefits:9,methodologyMaturity:7,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.07, trend:0.2 },
  { id:18, name:"Chilean Patagonia Native Reforestation", registry:"Verra", registryId:"VCS-2780", methodology:"Afforestation", vintage:2024, country:"Chile", region:"Latin America", sdgs:[15,13,6], issuedTotal:180000, retiredTotal:110000, description:"Native species reforestation across 8,000 ha of degraded pastoral land in southern Chile. Alerce and coig\u00FCe species with 200+ year carbon storage profiles. Strong permanence in temperate climate.", attributes:{permanence:8,additionality:8,leakageRisk:7,verificationQuality:8,coBenefits:7,methodologyMaturity:7,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.05, trend:0.4 },

  // ── METHANE CAPTURE ──────────────────────────────────────────────────────
  { id:19, name:"Bangladesh Brick Kiln Methane", registry:"Gold Standard", registryId:"GS-4210", methodology:"Methane Capture", vintage:2023, country:"Bangladesh", region:"South Asia", sdgs:[13,11,3], issuedTotal:520000, retiredTotal:410000, description:"Methane destruction from 150 traditional brick kilns converted to improved zigzag technology. 25x CO\u2082-equivalent reduction per tonne of methane captured. Strong local air quality improvements.", attributes:{permanence:8,additionality:8,leakageRisk:8,verificationQuality:8,coBenefits:7,methodologyMaturity:9,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.04, trend:0.3 },
  { id:20, name:"Brazil Landfill Gas-to-Energy", registry:"Verra", registryId:"VCS-1560", methodology:"Methane Capture", vintage:2022, country:"Brazil", region:"Latin America", sdgs:[13,7,11], issuedTotal:890000, retiredTotal:720000, description:"Captures and combusts landfill methane at 4 municipal waste sites in S\u00E3o Paulo state. Generates electricity from waste gas. Mature methodology with declining additionality as regulations evolve.", attributes:{permanence:8,additionality:5,leakageRisk:9,verificationQuality:7,coBenefits:6,methodologyMaturity:10,bufferAdequacy:8,regulatoryAlignment:6}, volatility:0.04, trend:-0.2 },

  // ── BIOCHAR ──────────────────────────────────────────────────────────────
  { id:21, name:"Pacific Biochar California", registry:"ACR", registryId:"ACR-BIO-055", methodology:"Biochar", vintage:2025, country:"United States", region:"North America", sdgs:[13,15,2], issuedTotal:15000, retiredTotal:12000, description:"Converts agricultural waste into biochar for soil amendment across California\u2019s Central Valley. 100+ year carbon stability in soil. Newer methodology with growing scientific consensus on permanence.", attributes:{permanence:9,additionality:8,leakageRisk:9,verificationQuality:8,coBenefits:6,methodologyMaturity:5,bufferAdequacy:8,regulatoryAlignment:8}, volatility:0.07, trend:0.4 },
  { id:22, name:"Kenya Biochar from Sugarcane Waste", registry:"Gold Standard", registryId:"GS-6050", methodology:"Biochar", vintage:2024, country:"Kenya", region:"East Africa", sdgs:[13,2,15,1], issuedTotal:8000, retiredTotal:5500, description:"Converts sugarcane bagasse waste into biochar in Kisumu region. Distributed to smallholder farms for soil improvement. Strong co-benefits for food security and farmer incomes.", attributes:{permanence:8,additionality:9,leakageRisk:8,verificationQuality:7,coBenefits:9,methodologyMaturity:5,bufferAdequacy:7,regulatoryAlignment:6}, volatility:0.08, trend:0.7 },

  // ── ENERGY EFFICIENCY ────────────────────────────────────────────────────
  { id:23, name:"Turkey Industrial Efficiency Program", registry:"Gold Standard", registryId:"GS-3450", methodology:"Energy Efficiency", vintage:2023, country:"Turkey", region:"Europe", sdgs:[9,13,12], issuedTotal:410000, retiredTotal:280000, description:"Energy efficiency upgrades across 85 industrial facilities in western Turkey. Boiler replacements, waste heat recovery, and process optimization. Verified 35% average energy intensity reduction.", attributes:{permanence:8,additionality:6,leakageRisk:8,verificationQuality:8,coBenefits:5,methodologyMaturity:9,bufferAdequacy:7,regulatoryAlignment:7}, volatility:0.03, trend:0.0 },

  // ── SOIL CARBON ──────────────────────────────────────────────────────────
  { id:24, name:"Australian Regenerative Grazing", registry:"ACR", registryId:"ACR-SC-201", methodology:"Soil Carbon", vintage:2024, country:"Australia", region:"Oceania", sdgs:[15,13,2], issuedTotal:95000, retiredTotal:48000, description:"Rotational grazing and cover cropping across 40,000 ha of cattle stations in Queensland. Soil organic carbon measured via direct sampling. Newer methodology with variable permanence.", attributes:{permanence:5,additionality:7,leakageRisk:6,verificationQuality:7,coBenefits:7,methodologyMaturity:4,bufferAdequacy:5,regulatoryAlignment:6}, volatility:0.08, trend:0.2 },
  { id:25, name:"Cambodia Regenerative Rice", registry:"Gold Standard", registryId:"GS-6180", methodology:"Soil Carbon", vintage:2025, country:"Cambodia", region:"Southeast Asia", sdgs:[2,13,1,6], issuedTotal:35000, retiredTotal:12000, description:"Alternate wetting and drying (AWD) rice cultivation across 15,000 ha in Battambang province. Reduces methane from paddy flooding by ~50%. Strong smallholder income co-benefits.", attributes:{permanence:4,additionality:8,leakageRisk:6,verificationQuality:7,coBenefits:9,methodologyMaturity:4,bufferAdequacy:4,regulatoryAlignment:5}, volatility:0.09, trend:0.5 },
];

// Enrich all projects
const PROJECTS = RAW_PROJECTS.map((p) => {
  const fairValue = calculateFairValue(p);
  const priceHistory = generatePriceHistory(fairValue, p.volatility, p.trend, p.id * 1337);
  const currentPrice = priceHistory[priceHistory.length - 1].marketPrice;
  const spread = +((fairValue - currentPrice) / currentPrice * 100).toFixed(1);
  const signal = spread > 8 ? "BUY" : spread < -8 ? "SELL" : "HOLD";
  const overallScore = +(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + p.attributes[k] * w, 0)).toFixed(1);
  return { ...p, fairValue, currentPrice, priceHistory, spread, signal, overallScore };
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
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

function PriceChart({ project }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-700 mb-1">Price History vs. Fair Value (18 months)</h4>
      <p className="text-xs text-gray-500 mb-3">Simulated broker feed. Green dashed line = attribute-weighted fair value.</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={project.priceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id={`grad-${project.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v, n) => [`$${v}`, n === "marketPrice" ? "Market" : "Fair Value"]} />
          <ReferenceLine y={project.fairValue} stroke="#10B981" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Fair: $${project.fairValue}`, position: "right", fill: "#10B981", fontSize: 10 }} />
          <Area type="monotone" dataKey="marketPrice" stroke="#3B82F6" strokeWidth={2} fill={`url(#grad-${project.id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeChart({ project }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-700 mb-1">Issuance & Retirement Volume</h4>
      <p className="text-xs text-gray-500 mb-3">High retirement:issuance ratio = strong demand signal.</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={project.priceHistory} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => v.toLocaleString()} />
          <Bar dataKey="issuance" fill="#CBD5E1" name="Issued" radius={[2, 2, 0, 0]} />
          <Bar dataKey="retirement" fill="#3B82F6" name="Retired" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AttributeRadar({ project }) {
  const data = ATTRIBUTES.map((a) => ({ attribute: a.label, score: project.attributes[a.key], fullMark: 10 }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="68%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 9.5, fill: "#374151" }} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 8 }} />
        <Radar dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function AttributeTable({ project }) {
  return (
    <div className="space-y-2">
      {ATTRIBUTES.map((a) => {
        const score = project.attributes[a.key];
        const w = WEIGHTS[a.key];
        const contrib = +((score / 10) * w * 100).toFixed(1);
        return (
          <div key={a.key} className="grid grid-cols-12 items-center gap-1.5">
            <div className="col-span-3">
              <p className="text-xs font-semibold text-gray-700 leading-tight">{a.label}</p>
              <p className="text-xs text-gray-400">{(w * 100).toFixed(0)}% wt</p>
            </div>
            <div className="col-span-6"><QualityBar score={score} /></div>
            <div className="col-span-3 text-right"><span className="text-xs font-mono text-blue-600">{contrib}%</span></div>
          </div>
        );
      })}
    </div>
  );
}

function FairValueCard({ project }) {
  const topDrivers = ATTRIBUTES.map((a) => ({ ...a, impact: project.attributes[a.key] * WEIGHTS[a.key] })).sort((a, b) => b.impact - a.impact);
  const top = topDrivers.slice(0, 3);
  const weak = [...topDrivers].sort((a, b) => a.impact - b.impact).slice(0, 2);
  const basePrice = METHOD_BASE[project.methodology];
  const vintageAdj = project.vintage >= 2025 ? 1.12 : project.vintage >= 2024 ? 1.08 : project.vintage >= 2023 ? 1.0 : 0.92;
  const qMult = (project.fairValue / basePrice / vintageAdj).toFixed(2);

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-bold text-gray-700 mb-2">Fair Value: ${project.fairValue}/tonne</h4>
      <p className="text-xs text-gray-500 mb-3">Base ({project.methodology}): ${basePrice} \u00D7 Quality: {qMult}x \u00D7 Vintage: {vintageAdj}</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs font-bold text-emerald-700 mb-1">Strongest Drivers</p>
          {top.map((d) => <p key={d.key} className="text-xs text-gray-600">\u2022 {d.label}: {project.attributes[d.key]}/10</p>)}
        </div>
        <div>
          <p className="text-xs font-bold text-amber-700 mb-1">Weakest</p>
          {weak.map((d) => <p key={d.key} className="text-xs text-gray-600">\u2022 {d.label}: {project.attributes[d.key]}/10</p>)}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <div><p className="text-xs text-gray-500">Market</p><p className="text-lg font-bold">${project.currentPrice}</p></div>
        <div className="text-xl text-gray-300">vs.</div>
        <div><p className="text-xs text-gray-500">Fair Value</p><p className="text-lg font-bold text-emerald-700">${project.fairValue}</p></div>
        <div className="text-right"><p className="text-xs text-gray-500">Spread</p>
          <p className={`text-lg font-bold ${project.spread > 0 ? "text-emerald-700" : "text-red-600"}`}>{project.spread > 0 ? "+" : ""}{project.spread}%</p>
        </div>
      </div>
      {project.signal === "BUY" && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2 border border-emerald-200"><strong>BUY.</strong> Market price is {Math.abs(project.spread)}% below fair value. Quality attributes support higher pricing.</p>}
      {project.signal === "HOLD" && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-200"><strong>HOLD.</strong> Spread within \u00B18% tolerance. No clear inefficiency.</p>}
      {project.signal === "SELL" && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2 border border-red-200"><strong>OVERPRICED.</strong> Market exceeds fair value by {Math.abs(project.spread)}%. Consider alternatives.</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function CarbonDashboard() {
  const [selectedId, setSelectedId] = useState(1);
  const [sortBy, setSortBy] = useState("spread");
  const [tab, setTab] = useState("analysis");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterSignal, setFilterSignal] = useState("All");
  const [filterRegion, setFilterRegion] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...PROJECTS];
    if (filterMethod !== "All") list = list.filter((p) => p.methodology === filterMethod);
    if (filterSignal !== "All") list = list.filter((p) => p.signal === filterSignal);
    if (filterRegion !== "All") list = list.filter((p) => p.region === filterRegion);
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase()));
    list.sort((a, b) => {
      if (sortBy === "spread") return b.spread - a.spread;
      if (sortBy === "quality") return b.overallScore - a.overallScore;
      if (sortBy === "price") return a.currentPrice - b.currentPrice;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [filterMethod, filterSignal, filterRegion, search, sortBy]);

  const selected = PROJECTS.find((p) => p.id === selectedId);
  const buyCount = PROJECTS.filter((p) => p.signal === "BUY").length;
  const holdCount = PROJECTS.filter((p) => p.signal === "HOLD").length;
  const sellCount = PROJECTS.filter((p) => p.signal === "SELL").length;
  const avgSpread = +(PROJECTS.reduce((s, p) => s + p.spread, 0) / PROJECTS.length).toFixed(1);

  // Spread chart data
  const spreadData = [...PROJECTS].sort((a, b) => b.spread - a.spread).map((p) => ({
    name: p.name.length > 16 ? p.name.substring(0, 14) + "\u2026" : p.name,
    spread: p.spread, methodology: p.methodology,
  }));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Carbon Market Intelligence</h1>
            <p className="text-xs text-gray-500">Attribute-weighted pricing model \u00B7 {PROJECTS.length} projects \u00B7 10 methodologies \u00B7 Simulated data</p>
          </div>
          <div className="flex items-center gap-4">
            <input type="text" placeholder="Search projects or countries\u2026" value={search} onChange={(e) => setSearch(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* ── STATS BAR ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-6 gap-2.5 mb-4">
          {[
            { label: "Projects", value: PROJECTS.length, sub: `${new Set(PROJECTS.map(p=>p.methodology)).size} methodologies`, color: "" },
            { label: "Buy Signals", value: buyCount, sub: "Undervalued", color: "text-emerald-700" },
            { label: "Hold", value: holdCount, sub: "Fair value", color: "text-amber-600" },
            { label: "Overpriced", value: sellCount, sub: "Above fair value", color: "text-red-600" },
            { label: "Avg Spread", value: `${avgSpread > 0 ? "+" : ""}${avgSpread}%`, sub: "vs. fair value", color: avgSpread > 0 ? "text-emerald-700" : "text-red-600" },
            { label: "Registries", value: new Set(PROJECTS.map(p=>p.registry)).size, sub: REGISTRIES.join(", "), color: "" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color || "text-gray-900"}`}>{s.value}</p>
              <p className="text-xs text-gray-400 truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── SPREAD OVERVIEW ───────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h4 className="text-sm font-bold text-gray-700 mb-1">Market Spread: All Projects</h4>
          <p className="text-xs text-gray-500 mb-2">Positive = undervalued opportunity \u00B7 Negative = overpriced relative to quality attributes</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={spreadData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeWidth={1.5} />
              <Tooltip formatter={(v) => [`${v}%`, "Spread"]} />
              <Bar dataKey="spread" radius={[3, 3, 0, 0]}>
                {spreadData.map((d, i) => (
                  <Cell key={i} fill={d.spread > 8 ? "#10B981" : d.spread < -8 ? "#EF4444" : "#F59E0B"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── FILTERS ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-gray-500 font-medium">Filters:</span>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Methodologies</option>
            {METHODOLOGIES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Regions</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterSignal} onChange={(e) => setFilterSignal(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="All">All Signals</option>
            <option value="BUY">Buy Only</option>
            <option value="HOLD">Hold Only</option>
            <option value="SELL">Overpriced Only</option>
          </select>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-500">Sort:</span>
            {[{k:"spread",l:"Opportunity"},{k:"quality",l:"Quality"},{k:"price",l:"Price"},{k:"name",l:"Name"}].map((s) => (
              <button key={s.k} onClick={() => setSortBy(s.k)}
                className={`px-2.5 py-1 text-xs rounded-full font-medium ${sortBy === s.k ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-4">

          {/* Left: Project List */}
          <div className="col-span-5">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{filtered.length} Projects</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-screen overflow-y-auto">
                {filtered.map((p) => (
                  <div key={p.id} onClick={() => { setSelectedId(p.id); setTab("analysis"); }}
                    className={`px-3 py-2.5 cursor-pointer transition-colors ${p.id === selectedId ? "bg-blue-50 border-l-4 border-blue-500" : "hover:bg-gray-50 border-l-4 border-transparent"}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.methodology} \u00B7 {p.registry} \u00B7 {p.country} \u00B7 {p.vintage}</p>
                      </div>
                      <SignalBadge signal={p.signal} spread={p.spread} />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-gray-400">Market</p>
                          <p className="text-sm font-bold">${p.currentPrice}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Fair</p>
                          <p className="text-sm font-semibold text-emerald-700">${p.fairValue}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Quality</p>
                          <p className="text-sm font-semibold">{p.overallScore}</p>
                        </div>
                      </div>
                      <MiniSparkline data={p.priceHistory} color={p.spread > 0 ? "#10B981" : p.spread < -8 ? "#EF4444" : "#F59E0B"} />
                    </div>
                    <div className="flex gap-0.5 mt-1.5">
                      {p.sdgs.slice(0, 4).map((s) => (
                        <span key={s} className="text-white text-xs font-bold px-1 py-0 rounded" style={{ backgroundColor: SDG_COLORS[s] || "#666", fontSize: "9px" }}>SDG{s}</span>
                      ))}
                      {p.sdgs.length > 4 && <span className="text-xs text-gray-400">+{p.sdgs.length - 4}</span>}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-gray-500 p-6 text-center">No projects match your filters.</p>}
              </div>
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div className="col-span-7">
            {selected && (
              <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{selected.name}</h2>
                    <p className="text-xs text-gray-500">{selected.registry} \u00B7 {selected.registryId} \u00B7 {selected.methodology} \u00B7 V{selected.vintage} \u00B7 {selected.country}</p>
                  </div>
                  <SignalBadge signal={selected.signal} spread={selected.spread} />
                </div>
                <p className="text-xs text-gray-600 mt-1.5 mb-3 leading-relaxed">{selected.description}</p>

                <div className="flex gap-0.5 border-b border-gray-200 mb-4">
                  {[{ key: "analysis", label: "Pricing Analysis" }, { key: "quality", label: "Quality Profile" }, { key: "volume", label: "Supply & Demand" }].map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === "analysis" && (
                  <div className="space-y-4">
                    <PriceChart project={selected} />
                    <FairValueCard project={selected} />
                  </div>
                )}
                {tab === "quality" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-1">Quality Profile</h4>
                      <AttributeRadar project={selected} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Attribute Breakdown</h4>
                      <AttributeTable project={selected} />
                    </div>
                  </div>
                )}
                {tab === "volume" && (
                  <div className="space-y-4">
                    <VolumeChart project={selected} />
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: "Total Issued", value: `${(selected.issuedTotal / 1e6).toFixed(2)}M`, sub: "tCO\u2082e" },
                        { label: "Total Retired", value: `${(selected.retiredTotal / 1e6).toFixed(2)}M`, sub: "tCO\u2082e" },
                        { label: "Retirement Rate", value: `${((selected.retiredTotal / selected.issuedTotal) * 100).toFixed(0)}%`, sub: "of issued" },
                      ].map((s, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p className="text-lg font-bold">{s.value}</p>
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

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <div className="mt-6 pt-3 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Carbon Market Intelligence Platform \u00B7 MVP Prototype \u00B7 {PROJECTS.length} Projects \u00B7 Simulated Data \u00B7 SFE Spring 2026</p>
          <p className="text-xs text-gray-400 mt-0.5">Pricing: 8-attribute weighted model \u00D7 methodology base \u00D7 vintage adjustment. Signals: BUY ({">"}+8%), HOLD (\u00B18%), OVERPRICED ({"<"}-8%).</p>
        </div>
      </div>
    </div>
  );
}