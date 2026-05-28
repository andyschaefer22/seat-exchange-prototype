import { notFound } from "next/navigation";
import { ORDERS_BY_ID } from "@/lib/data";
import { OrderPage } from "@/components/order/OrderPage";

export default async function OrderRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = ORDERS_BY_ID[orderId];
  if (!order) notFound();
  return <OrderPage order={order} />;
}
