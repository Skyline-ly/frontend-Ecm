import {
  Users,
  Store,
  Package,
  ShoppingCart,
  Clock,
  CheckCircle,
} from "lucide-react";
import "./Dashboard.css";

const stats = [
  { title: "Total Users", value: "1,248", icon: Users, color: "blue" },
  { title: "Total Sellers", value: "186", icon: Store, color: "purple" },
  { title: "Total Products", value: "3,542", icon: Package, color: "orange" },
  { title: "Total Orders", value: "825", icon: ShoppingCart, color: "green" },
];

const recentOrders = [
  { id: "ORD-1001", customer: "John", amount: "$120.00", status: "Pending" },
  { id: "ORD-1002", customer: "Mary", amount: "$85.00", status: "Processing" },
  { id: "ORD-1003", customer: "David", amount: "$240.00", status: "Completed" },
  { id: "ORD-1004", customer: "Sokha", amount: "$65.00", status: "Pending" },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here is what's happening in your marketplace.</p>
        </div>
      </div>

      <div className="dashboard-stats">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="stat-card" key={item.title}>
              <div className={`stat-icon ${item.color}`}>
                <Icon size={23} />
              </div>
              <div>
                <p>{item.title}</p>
                <h2>{item.value}</h2>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel orders-panel">
          <div className="panel-heading">
            <h3>Recent Orders</h3>
            <span>Latest transactions</span>
          </div>

          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.amount}</td>
                    <td>
                      <span
                        className={`order-status ${order.status.toLowerCase()}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <h3>Marketplace Summary</h3>
            <span>Overview</span>
          </div>

          <div className="summary-item">
            <div className="summary-icon pending">
              <Clock size={20} />
            </div>
            <div>
              <strong>12</strong>
              <p>Pending seller approvals</p>
            </div>
          </div>

          <div className="summary-item">
            <div className="summary-icon completed">
              <CheckCircle size={20} />
            </div>
            <div>
              <strong>24</strong>
              <p>Orders completed today</p>
            </div>
          </div>

          <div className="summary-item">
            <div className="summary-icon pending">
              <Package size={20} />
            </div>
            <div>
              <strong>8</strong>
              <p>Products waiting for review</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}