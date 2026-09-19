import { ArrowRight, BarChart3, CheckCircle2, Layers3, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardModuleSummary } from './useStudentDashboardProgress';
import './studentProgressOverview.css';

type Props = {
  modules: DashboardModuleSummary[];
  loading: boolean;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasStarted(module: DashboardModuleSummary) {
  if (!module.available) return false;
  if (module.key === 'reading' || module.key === 'listening') {
    return (module.progress?.completed ?? 0) > 0;
  }
  return (module.progress?.started ?? 0) > 0;
}

export function StudentProgressOverview({ modules, loading }: Props) {
  const availableModules = modules.filter((module) => module.available);
  const activeModules = availableModules.filter(hasStarted);
  const completedModules = availableModules.filter((module) => clampPercent(module.percent) >= 100);

  const overallPercent = availableModules.length > 0
    ? Math.round(
        availableModules.reduce((sum, module) => sum + clampPercent(module.percent), 0)
          / availableModules.length,
      )
    : 0;

  const mostAdvanced = activeModules.length > 0
    ? [...activeModules].sort((a, b) => clampPercent(b.percent) - clampPercent(a.percent))[0]
    : null;

  const isInitialLoading = loading && modules.length === 0;

  return (
    <section className="student-progress-v2 panel" aria-labelledby="student-progress-v2-title">
      <div className="dashboard-section-heading student-progress-v2-heading">
        <div>
          <p className="eyebrow">PROGRESS OVERVIEW</p>
          <h2 id="student-progress-v2-title">Ringkasan Perjalanan Belajar</h2>
        </div>
        <p>Rata-rata progress seluruh modul utama KOJAC dalam satu tampilan.</p>
      </div>

      {isInitialLoading ? (
        <div className="student-progress-v2-loading" aria-label="Memuat progress overview">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="student-progress-v2-layout">
          <div className="student-progress-v2-summary">
            <div
              className="student-progress-v2-ring"
              role="progressbar"
              aria-label="Progress keseluruhan"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={overallPercent}
              style={{
                background: `conic-gradient(var(--maroon) ${overallPercent}%, #eee5e7 ${overallPercent}% 100%)`,
              }}
            >
              <div>
                <strong>{availableModules.length > 0 ? `${overallPercent}%` : '—'}</strong>
                <span>Overall</span>
              </div>
            </div>

            <div className="student-progress-v2-stats">
              <div>
                <Layers3 size={18} aria-hidden="true"/>
                <strong>{activeModules.length} / {availableModules.length || 7}</strong>
                <span>Modul aktif</span>
              </div>
              <div>
                <CheckCircle2 size={18} aria-hidden="true"/>
                <strong>{completedModules.length} / {availableModules.length || 7}</strong>
                <span>Modul 100%</span>
              </div>
              <div>
                <TrendingUp size={18} aria-hidden="true"/>
                <strong>
                  {mostAdvanced ? `${clampPercent(mostAdvanced.percent)}%` : '—'}
                </strong>
                <span>{mostAdvanced ? mostAdvanced.title : 'Belum ada progress'}</span>
              </div>
            </div>

            <p className="student-progress-v2-note">
              Overall dihitung dari rata-rata persentase 7 modul, sehingga modul dengan jumlah item besar tidak mendominasi hasil.
            </p>
          </div>

          <div className="student-progress-v2-breakdown">
            <div className="student-progress-v2-breakdown-title">
              <BarChart3 size={18} aria-hidden="true"/>
              <strong>Progress per modul</strong>
            </div>

            <div className="student-progress-v2-module-list">
              {modules.map((module) => {
                const percent = clampPercent(module.percent);

                return (
                  <Link
                    key={module.key}
                    className="student-progress-v2-module"
                    to={module.route}
                    aria-label={`Buka ${module.title}`}
                  >
                    <div className="student-progress-v2-module-top">
                      <span>{module.title}</span>
                      <strong>{module.available ? `${percent}%` : '—'}</strong>
                    </div>
                    <div className="student-progress-v2-track" aria-hidden="true">
                      <span style={{ width: module.available ? `${percent}%` : '0%' }}/>
                    </div>
                    <ArrowRight size={14} className="student-progress-v2-arrow" aria-hidden="true"/>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
