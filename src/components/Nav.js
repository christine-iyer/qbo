import { Link } from "react-router-dom";

export default function Nav(props) {
  return (
    <div className="nav">
      <Link to="/">
        <div>Auth</div>
      </Link>
      <Link to="/create-invoice">
        <div>Create Invoice</div>
      </Link>
      <Link to="/create-customer">
        <div>Create Customer</div>
      </Link>
      <Link to="/customers">
        <div>View Customers</div>
      </Link>
      <Link to="/import-customers">
        <div>Import Customers</div>
      </Link>
      <Link to="/manage-invoices">
        <div>Manage Invoices</div>
      </Link>
      <Link to="/items">
        <div>View Items</div>
      </Link>
      <Link to="/delivery-report">
        <div>Delivery Report</div>
      </Link>
      <Link to="/delivery-destinations">
        <div>Manage Destinations</div>
      </Link>
    </div>
  );
}
