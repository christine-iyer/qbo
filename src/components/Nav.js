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
      <Link to="/customers">
        <div>View Customers</div>
      </Link>
    </div>
  );
}
