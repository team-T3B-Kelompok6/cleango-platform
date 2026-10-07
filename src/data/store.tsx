import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { initialOrders, type Order } from "./orders";
import {
  initialCustomers,
  initialFaqs,
  initialSchedules,
  initialServices,
  initialStaff,
  type Customer,
  type Faq,
  type Schedule,
  type Service,
  type Staff,
} from "./admin";

interface Store {
  orders: Order[];
  updateOrder: (order: Order) => void;
  search: string;
  setSearch: (search: string) => void;
  services: Service[];
  setServices: Dispatch<SetStateAction<Service[]>>;
  staff: Staff[];
  setStaff: Dispatch<SetStateAction<Staff[]>>;
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  faqs: Faq[];
  setFaqs: Dispatch<SetStateAction<Faq[]>>;
  schedules: Schedule[];
  setSchedules: Dispatch<SetStateAction<Schedule[]>>;
}
const StoreContext = createContext<Store | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [services, setServices] = useState(initialServices);
  const [staff, setStaff] = useState(initialStaff);
  const [customers, setCustomers] = useState(initialCustomers);
  const [faqs, setFaqs] = useState(initialFaqs);
  const [schedules, setSchedules] = useState(initialSchedules);
  const updateOrder = (updated: Order) =>
    setOrders((current) =>
      current.map((order) => (order.id === updated.id ? updated : order)),
    );
  return (
    <StoreContext.Provider
      value={{
        orders,
        updateOrder,
        search,
        setSearch,
        services,
        setServices,
        staff,
        setStaff,
        customers,
        setCustomers,
        faqs,
        setFaqs,
        schedules,
        setSchedules,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export function useDemo() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useDemo must be inside DemoProvider");
  return value;
}
