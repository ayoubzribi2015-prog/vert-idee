import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  Target,
  BarChart3,
  FileCheck,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { SdgAlignmentItem } from '../types';

interface SdgAlignmentTabProps {
  sdgItems: SdgAlignmentItem[];
}

export const OFFICIAL_SDG_TITLES: Record<number, string> = {
  1: 'Pas de pauvreté',
  2: 'Faim « Zéro »',
  3: 'Bonne santé et bien-être',
  4: 'Éducation de qualité',
  5: 'Égalité entre les sexes',
  6: 'Eau propre et assainissement',
  7: "Énergie propre et d'un coût abordable",
  8: 'Travail décent et croissance économique',
  9: 'Industrie, innovation et infrastructure',
  10: 'Inégalités réduites',
  11: 'Villes et communautés durables',
  12: 'Consommation et production responsables',
  13: 'Mesures relatives à la lutte contre les changements climatiques',
  14: 'Vie aquatique',
  15: 'Vie terrestre',
  16: 'Paix, justice et institutions efficaces',
  17: 'Partenariats pour la réalisation des objectifs',
};

export const OFFICIAL_SDG_SHORT: Record<number, string> = {
  1: 'Pauvreté',
  2: 'Faim Zéro',
  3: 'Santé & Bien-être',
  4: 'Éducation',
  5: 'Égalité Sexes',
  6: 'Eau Propre',
  7: 'Énergie Propre',
  8: 'Travail Décent',
  9: 'Industrie & Innov.',
  10: 'Inégalités',
  11: 'Villes Durables',
  12: 'Consom. & Prod.',
  13: 'Action Climat',
  14: 'Vie Aquatique',
  15: 'Vie Terrestre',
  16: 'Paix & Justice',
  17: 'Partenariats',
};

const SDG_COLORS: Record<number, { bg: string; text: string; hex: string; border: string; lightBg: string }> = {
  1: { bg: 'bg-[#E5243B]', text: 'text-white', hex: '#E5243B', border: 'border-[#E5243B]', lightBg: 'bg-[#E5243B]/10' },
  2: { bg: 'bg-[#DDA63A]', text: 'text-white', hex: '#DDA63A', border: 'border-[#DDA63A]', lightBg: 'bg-[#DDA63A]/10' },
  3: { bg: 'bg-[#4C9F38]', text: 'text-white', hex: '#4C9F38', border: 'border-[#4C9F38]', lightBg: 'bg-[#4C9F38]/10' },
  4: { bg: 'bg-[#C5192D]', text: 'text-white', hex: '#C5192D', border: 'border-[#C5192D]', lightBg: 'bg-[#C5192D]/10' },
  5: { bg: 'bg-[#FF3A21]', text: 'text-white', hex: '#FF3A21', border: 'border-[#FF3A21]', lightBg: 'bg-[#FF3A21]/10' },
  6: { bg: 'bg-[#26BDE2]', text: 'text-white', hex: '#26BDE2', border: 'border-[#26BDE2]', lightBg: 'bg-[#26BDE2]/10' },
  7: { bg: 'bg-[#FCC30B]', text: 'text-slate-900', hex: '#FCC30B', border: 'border-[#FCC30B]', lightBg: 'bg-[#FCC30B]/15' },
  8: { bg: 'bg-[#A21942]', text: 'text-white', hex: '#A21942', border: 'border-[#A21942]', lightBg: 'bg-[#A21942]/10' },
  9: { bg: 'bg-[#FD6925]', text: 'text-white', hex: '#FD6925', border: 'border-[#FD6925]', lightBg: 'bg-[#FD6925]/10' },
  10: { bg: 'bg-[#DD1367]', text: 'text-white', hex: '#DD1367', border: 'border-[#DD1367]', lightBg: 'bg-[#DD1367]/10' },
  11: { bg: 'bg-[#FD9D24]', text: 'text-white', hex: '#FD9D24', border: 'border-[#FD9D24]', lightBg: 'bg-[#FD9D24]/10' },
  12: { bg: 'bg-[#BF8B2E]', text: 'text-white', hex: '#BF8B2E', border: 'border-[#BF8B2E]', lightBg: 'bg-[#BF8B2E]/10' },
  13: { bg: 'bg-[#3F7E44]', text: 'text-white', hex: '#3F7E44', border: 'border-[#3F7E44]', lightBg: 'bg-[#3F7E44]/10' },
  14: { bg: 'bg-[#0A97D9]', text: 'text-white', hex: '#0A97D9', border: 'border-[#0A97D9]', lightBg: 'bg-[#0A97D9]/10' },
  15: { bg: 'bg-[#56C02B]', text: 'text-white', hex: '#56C02B', border: 'border-[#56C02B]', lightBg: 'bg-[#56C02B]/10' },
  16: { bg: 'bg-[#00689D]', text: 'text-white', hex: '#00689D', border: 'border-[#00689D]', lightBg: 'bg-[#00689D]/10' },
  17: { bg: 'bg-[#19486A]', text: 'text-white', hex: '#19486A', border: 'border-[#19486A]', lightBg: 'bg-[#19486A]/10' },
};

export const SdgAlignmentTab: React.FC<SdgAlignmentTabProps> = ({ sdgItems }) => {
  const [filter, setFilter] = useState<'all' | 'majeur' | 'secondaire' | 'dnsh'>('all');
  const [selectedOdd, setSelectedOdd] = useState<number | null>(null);

  // Compute stats
  const activeSdgMap = new Map<number, SdgAlignmentItem>();
  sdgItems.forEach((item) => activeSdgMap.set(item.oddNumber, item));

  const totalTargetsCount = sdgItems.reduce((acc, curr) => {
    return acc + (curr.targetsDetail?.length || curr.targets?.length || 0);
  }, 0);

  const majeursCount = sdgItems.filter((i) => (i.level || 'Majeur') === 'Majeur').length;
  const secondairesCount = sdgItems.filter((i) => i.level === 'Secondaire').length;

  const filteredItems = sdgItems.filter((item) => {
    if (selectedOdd !== null && item.oddNumber !== selectedOdd) return false;
    if (filter === 'majeur') return (item.level || 'Majeur') === 'Majeur';
    if (filter === 'secondaire') return item.level === 'Secondaire';
    if (filter === 'dnsh') return Boolean(item.dnshAssessment);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 5. Alignement ODD Header */}
      <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
            <h2 className="text-xl font-black text-[#063428] font-serif-title tracking-tight">
              5. Alignement ODD de l'ONU (Agenda 2030)
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Cadre méthodologique normé SDG Compass (UN Global Compact, GRI, WBCSD) & Matrice de double matérialité CSRD
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>17 ODD • 169 cibles • 231 indicateurs</span>
        </div>
      </div>

      {/* Synthesis KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ODD Ciblés</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono-numbers">{sdgItems.length}</span>
            <span className="text-xs text-slate-400">/ 17 mondiaux</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cartographie d'impact ciblée</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Impact Majeur</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 font-mono-numbers">{majeursCount}</span>
            <span className="text-xs text-emerald-600/80">cœur de métier</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Contributions directes mesurées</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sous-Cibles ONU</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono-numbers">{totalTargetsCount}</span>
            <span className="text-xs text-slate-400">cibles activées</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Indicateurs normés 2030</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Test DNSH</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-teal-700 font-heading">Non-Nuisance</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Absence de préjudice important</p>
        </div>
      </div>

      {/* Global 17 SDG Matrix Wheel Interactive View */}
      <div className="bg-gradient-to-br from-white to-stone-50/70 rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#063428]" />
              Roue Globale des 17 Objectifs de Développement Durable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliquez sur un ODD actif pour filtrer directement son analyse détaillée et ses indicateurs ONU.
            </p>
          </div>

          {selectedOdd !== null && (
            <button
              onClick={() => setSelectedOdd(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md transition-colors self-start sm:self-auto flex items-center gap-1 border border-emerald-200"
            >
              <span>Afficher tous les ODD</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1 rounded">✕</span>
            </button>
          )}
        </div>

        {/* 17 SDG Tiles Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 gap-2">
          {Array.from({ length: 17 }, (_, i) => i + 1).map((num) => {
            const isActive = activeSdgMap.has(num);
            const activeItem = activeSdgMap.get(num);
            const isSelected = selectedOdd === num;
            const colors = SDG_COLORS[num];
            const isMajeur = (activeItem?.level || 'Majeur') === 'Majeur';

            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  if (isActive) {
                    setSelectedOdd(selectedOdd === num ? null : num);
                  }
                }}
                disabled={!isActive}
                className={`relative group rounded-xl p-2.5 flex flex-col justify-between text-left transition-all duration-150 min-h-[76px] ${
                  isActive
                    ? `${colors.bg} ${colors.text} shadow-2xs hover:shadow-md cursor-pointer ${
                        isSelected ? 'ring-3 ring-emerald-500 ring-offset-2 scale-[1.03]' : 'hover:-translate-y-0.5'
                      }`
                    : 'bg-stone-100/80 text-stone-400 border border-stone-200/60 cursor-not-allowed opacity-45'
                }`}
                title={`ODD ${num} : ${OFFICIAL_SDG_TITLES[num]}${isActive ? ` (${isMajeur ? 'Contribution Majeure' : 'Contribution Secondaire'})` : ' (Non ciblé)'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-black font-mono-numbers leading-none">{num}</span>
                  {isActive && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isMajeur ? 'bg-white shadow-2xs' : 'bg-white/70'
                      }`}
                      title={isMajeur ? 'Contribution Majeure (Cœur de métier)' : 'Contribution Secondaire'}
                    />
                  )}
                </div>

                <div className="mt-1.5">
                  <p className="text-[10px] font-bold leading-tight line-clamp-2">
                    {OFFICIAL_SDG_SHORT[num]}
                  </p>
                </div>

                {isActive && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[8px] font-semibold uppercase tracking-wider px-1 py-0.2 rounded bg-black/20">
                      {isMajeur ? 'Majeur' : 'Sec.'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              setFilter('all');
              setSelectedOdd(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'all' && selectedOdd === null
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Tous les ODD ({sdgItems.length})</span>
          </button>

          <button
            onClick={() => {
              setFilter('majeur');
              setSelectedOdd(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'majeur'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Impact Majeur / Direct ({majeursCount})</span>
          </button>

          <button
            onClick={() => {
              setFilter('secondaire');
              setSelectedOdd(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'secondaire'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Impact Secondaire / Transverse ({secondairesCount})</span>
          </button>

          <button
            onClick={() => {
              setFilter('dnsh');
              setSelectedOdd(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'dnsh'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vérification DNSH & Risques</span>
          </button>
        </div>

        {selectedOdd !== null && (
          <span className="text-xs font-semibold text-slate-500">
            Filtre : ODD {selectedOdd} ({OFFICIAL_SDG_TITLES[selectedOdd]})
          </span>
        )}
      </div>

      {/* Grid of Detailed Technical SDG Cards */}
      <div className="grid grid-cols-1 gap-5">
        {filteredItems.map((odd) => {
          const colors = SDG_COLORS[odd.oddNumber] || {
            bg: 'bg-emerald-700',
            text: 'text-white',
            hex: '#047857',
            border: 'border-emerald-700',
            lightBg: 'bg-emerald-50',
          };
          const officialTitle = OFFICIAL_SDG_TITLES[odd.oddNumber] || odd.title;
          const isMajeur = (odd.level || 'Majeur') === 'Majeur';

          return (
            <div
              key={odd.oddNumber}
              id={`sdg-${odd.oddNumber}`}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs hover:border-stone-300 transition-all space-y-5"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-100">
                <div className="flex items-start gap-4">
                  {/* Big SDG Tile */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-md ${colors.bg} ${colors.text}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-90">
                      ODD
                    </span>
                    <span className="text-2xl font-black font-mono-numbers leading-tight mt-0.5">
                      {odd.oddNumber}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Objectif de Développement Durable {odd.oddNumber}
                      </span>

                      {/* Contribution level badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isMajeur
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {isMajeur ? (
                          <>
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Contribution Majeure (Cœur de métier / Direct)</span>
                          </>
                        ) : (
                          <>
                            <Layers className="w-3 h-3 text-sky-600" />
                            <span>Contribution Secondaire (Transverse)</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 font-heading leading-snug mt-1">
                      {officialTitle}
                    </h4>
                  </div>
                </div>

                {/* Normative linkage badges (GRI & CSRD/ESRS) */}
                <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 shrink-0">
                  {odd.csrdEsrs && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                      CSRD : {odd.csrdEsrs}
                    </span>
                  )}
                  {odd.griStandards && odd.griStandards.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {odd.griStandards.map((gri, gIdx) => (
                        <span
                          key={gIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          {gri}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Operational Contribution Section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <span>Contribution concrète & opérationnelle sur le terrain :</span>
                </div>
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {odd.contribution}
                </div>
              </div>

              {/* Sub-targets & Official UN Indicators */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Target className="w-4 h-4 text-sky-700" />
                    <span>Sous-cibles officielles de l'ONU & Indicateurs normés :</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {(odd.targetsDetail?.length || odd.targets?.length || 0)} sous-cible(s)
                  </span>
                </div>

                {odd.targetsDetail && odd.targetsDetail.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {odd.targetsDetail.map((td, tIdx) => (
                      <div
                        key={tIdx}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors space-y-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono-numbers shrink-0 text-white"
                            style={{ backgroundColor: colors.hex }}
                          >
                            Cible {td.code}
                          </span>
                          <div className="text-xs text-slate-800 font-medium leading-relaxed">
                            {td.title}
                          </div>
                        </div>

                        {(td.indicator || td.targetKpi) && (
                          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                            {td.indicator && (
                              <span className="text-slate-600 flex items-center gap-1">
                                <span className="font-semibold text-slate-700">Indicateur ONU :</span>
                                <span className="text-sky-800 font-mono-numbers">{td.indicator}</span>
                              </span>
                            )}
                            {td.targetKpi && (
                              <span className="text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{td.targetKpi}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Fallback for simple targets string array
                  <div className="flex flex-wrap gap-2">
                    {odd.targets.map((target, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 text-slate-800 border border-slate-200 flex items-center gap-2"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: colors.hex }}
                        />
                        <span>{target}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tracked Project KPIs */}
              {odd.kpis && odd.kpis.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <BarChart3 className="w-4 h-4 text-emerald-700" />
                    <span>Indicateurs Clés de Performance (KPIs) suivis :</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {odd.kpis.map((kpi, kIdx) => (
                      <span
                        key={kIdx}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80 inline-flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {kpi}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DNSH Assessment (Do No Significant Harm) */}
              {odd.dnshAssessment && (
                <div className="bg-teal-50/60 rounded-xl p-3.5 border border-teal-200/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Garantie de Non-Nuisance (Do No Significant Harm - DNSH) :</span>
                  </div>
                  <p className="text-xs text-teal-950/80 leading-relaxed pl-6">
                    {odd.dnshAssessment}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Aucun ODD ne correspond à ce filtre</h4>
            <p className="text-xs text-slate-500">
              Réinitialisez le filtre pour voir l'ensemble des {sdgItems.length} Objectifs de Développement Durable analysés.
            </p>
            <button
              onClick={() => {
                setFilter('all');
                setSelectedOdd(null);
              }}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Methodological Reference Box */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200/90 p-5 space-y-3 text-xs text-stone-600">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#063428] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 font-heading">
              Cadrage Méthodologique : Le Guide SDG Compass & Directive CSRD
            </h4>
            <p className="leading-relaxed">
              L'audit d'alignement ODD de <strong>Vert'Idée</strong> suit le protocole normé du <em>SDG Compass</em>, conjointement développé par la GRI (Global Reporting Initiative), le Pacte Mondial de l'ONU et le WBCSD. Afin d'éviter toute dérive de <em>SDG-washing</em> (saupoudrage de cibles sans preuves mesurables), notre Collège d'Experts applique trois principes directeurs stricts :
            </p>
            <ul className="list-disc pl-4 space-y-1 pt-1 text-slate-700">
              <li>
                <strong>Hiérarchisation de la matérialité :</strong> Séparation nette entre <em>Impact Majeur</em> (lié aux flux de matière et d'énergie du cœur de métier) et <em>Impact Secondaire</em> (effets indirects ou transversaux sur la chaîne de valeur).
              </li>
              <li>
                <strong>Ancrage sur les sous-cibles et indicateurs officiels de l'ONU :</strong> Chaque ODD est décliné jusqu'au niveau de ses sous-cibles de l'Agenda 2030 avec leurs codes d'indicateurs de suivi universels.
              </li>
              <li>
                <strong>Principe DNSH (Do No Significant Harm) :</strong> Contrôle systématique de l'absence de préjudice grave porté à un autre ODD (ex: arbitrage négatif entre production d'énergie et préservation des ressources en eau ou de la biodiversité).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
