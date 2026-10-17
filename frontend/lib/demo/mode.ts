/** Local frontend preview only. Never replaces the production API. */
export const adminDemoEnabled = () =>
  process.env.NODE_ENV !== 'production' &&
  process.env.ADMIN_DEMO_ENABLED === 'true';
