// ============================================================
// API クライアント設定
// ============================================================
// BASE_URL を、公開済みのWeb管理画面のURLに変更してください。
// 例: "https://restadmin-srdbatub.manus.space"
// ============================================================
const BASE_URL = "https://restadmin-srdbatub.manus.space";

export type Dish = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  category: "lunch" | "dinner";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  dishId?: number;
  name: string;
  price: number;
  quantity: number;
};

export type OrderCreateResult = {
  orderId: number;
  orderNo: string;
  qrToken: string;
};

export type OrderStatus = "pending" | "preparing" | "ready";

export type OrderStatusItem = {
  id: number;
  orderNo: string;
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
};

async function trpcQuery<T>(procedure: string, input?: unknown): Promise<T> {
  const url =
    input !== undefined
      ? `${BASE_URL}/api/trpc/${procedure}?input=${encodeURIComponent(
          JSON.stringify({ json: input })
        )}`
      : `${BASE_URL}/api/trpc/${procedure}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  return data.result?.data?.json as T;
}

async function trpcMutation<T>(procedure: string, input: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  return data.result?.data?.json as T;
}

export async function fetchAllDishes(): Promise<Dish[]> {
  return trpcQuery<Dish[]>("dishes.list");
}

export async function fetchDishesByCategory(
  category: "lunch" | "dinner"
): Promise<Dish[]> {
  return trpcQuery<Dish[]>("dishes.byCategory", { category });
}

export async function fetchDishById(id: number): Promise<Dish> {
  return trpcQuery<Dish>("dishes.byId", { id });
}

export async function createOrder(items: OrderItem[]): Promise<OrderCreateResult> {
  return trpcMutation<OrderCreateResult>("orders.create", { items });
}

export async function fetchOrderByToken(token: string): Promise<{
  id: number;
  orderNo: string;
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
  items: Array<{ name: string; price: number; quantity: number }>;
}> {
  return trpcQuery("orders.byToken", { token });
}

export async function fetchOrderStatusList(): Promise<OrderStatusItem[]> {
  return trpcQuery<OrderStatusItem[]>("orders.statusList");
}
