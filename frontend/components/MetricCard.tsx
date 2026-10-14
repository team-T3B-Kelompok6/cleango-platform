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
  compactValue = false,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note: string;
  icon: IconName;
  tone?: 'green' | 'blue' | 'amber';
  uiIcon?: UiIconName;
  compactValue?: boolean;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-top">
        <p className="metric-label">{label}</p>
        <span className={`metric-icon ${tone}`}>
          {uiIcon ? <UiIcon name={uiIcon} /> : <Icon name={icon} />}
        </span>
      </div>
      <div
        className={'metric-value' + (compactValue ? ' metric-value-text' : '')}
      >
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <span className="metric-note">{note}</span>
    </article>
  );
}
