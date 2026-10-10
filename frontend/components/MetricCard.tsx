import { Icon, type IconName } from './Icon';
import { UiIcon, type UiIconName } from './UiIcon';
export function MetricCard({
  label,
  value,
  unit,
  note,
  icon,
  tone = 'green',
  uiIcon,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note: string;
  icon: IconName;
  tone?: 'green' | 'blue' | 'amber';
  uiIcon?: UiIconName;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>
        <p className="metric-label">{label}</p>
        <div className="metric-value">
          {value}
          <span>{unit}</span>
        </div>
        <span className={`metric-note ${tone === 'blue' ? 'green' : tone}`}>
          {note}
        </span>
      </div>
      <span className={`metric-icon ${tone}`}>
        {uiIcon ? <UiIcon name={uiIcon} /> : <Icon name={icon} />}
      </span>
    </article>
  );
}
