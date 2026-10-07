const assets = {
  search: "8844d",
  calendar: "59901",
  bell: "b9432",
  down: "35f4f",
  announcement: "2b48d",
  orders: "a0a88",
  working: "ae5bf",
  clock: "43d15",
  check: "61e27",
  arrow: "15c3c",
  chevron: "562bc",
  engine: "6de53",
  brand: "a7088",
  dashboard: "9bce3",
  package: "6e0a2",
  schedule: "6bc33",
  services: "c64d8",
  faq: "8bf6e",
  staff: "74c74",
  customers: "d07f9",
  report: "56a73",
  leaf: "e96ee",
  logout: "d0bcf",
} as const;

export type IconName = keyof typeof assets;
export function Icon({ name }: { name: IconName }) {
  return (
    <img
      className="icon"
      src={`/assets/${assets[name]}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
