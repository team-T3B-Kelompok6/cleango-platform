import type { DashboardSummary } from '../data/dashboardSummary';
import { SopButton } from '@/components/SopButton';
import {
  ButtonLink,
  MetricCard,
  MetricGrid,
  PageHeader,
  SectionHeading,
  TextLink,
} from '@/components/ui';
import { ActivityList } from './ActivityList';
import { AnnouncementCard } from './AnnouncementCard';
import { DASHBOARD_COPY, buildMetrics } from '../data/dashboardCopy';

export function DashboardView({ summary }: { summary: DashboardSummary }) {
  return (
    <>
      <PageHeader
        align="start"
        title={DASHBOARD_COPY.title}
        description={DASHBOARD_COPY.intro(summary.greeting)}
      />
      <AnnouncementCard
        title={DASHBOARD_COPY.announcement.title}
        body={DASHBOARD_COPY.announcement.body}
        action={<SopButton />}
      />
      <SectionHeading
        title={DASHBOARD_COPY.metrics.title}
        meta={DASHBOARD_COPY.metrics.updated(summary.updatedAt)}
      />
      <MetricGrid columns={4}>
        {buildMetrics(summary.totals).map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </MetricGrid>
      <SectionHeading
        title={DASHBOARD_COPY.activity.title}
        action={
          <TextLink href="/pesanan">{DASHBOARD_COPY.activity.seeAll}</TextLink>
        }
      />
      <ActivityList
        orders={summary.recent}
        emptyAction={
          <ButtonLink href="/pesanan">
            {DASHBOARD_COPY.activity.emptyAction}
          </ButtonLink>
        }
      />
    </>
  );
}
