import { Route, Routes } from 'react-router-dom';
import QuickBooksAuth from './components/QuickBooksAuth';
import CreateInvoice from './components/CreateInvoice';
import CreateCustomer from './components/CreateCustomer';
import FetchCustomers from './components/FetchCustomers';
import ManageInvoices from './components/ManageInvoices';
import ItemsList from './components/ItemsList';
import DeliveryReport from './components/DeliveryReport';
import DeliveryDestinations from './components/DeliveryDestinations';
import BulkCustomerImport from './components/BulkCustomerImport';
import Nav from './components/Nav';
import okeyDokey from './okeydonkey.PNG';
function App(){
  return (
    <div className="App">
      <Nav/>
      <img src={okeyDokey} alt="Okey Dokey Logo" style={{ width: '200px', margin: '20px' }} />
      <h1>Okey Donkey Integration</h1>
      <p>Welcome to the Okey Donkey. Use the navigation above to access different features.</p>

    <Routes>
      <Route path="/" element={<QuickBooksAuth />} />
      <Route path="/create-invoice" element={<CreateInvoice />} />
      <Route path="/create-customer" element={<CreateCustomer />} />
      <Route path="/customers" element={<FetchCustomers />} />
      <Route path="/import-customers" element={<BulkCustomerImport />} />
      <Route path="/manage-invoices" element={<ManageInvoices />} />
      <Route path="/items" element={<ItemsList />} />
      <Route path="/delivery-report" element={<DeliveryReport />} />
      <Route path="/delivery-destinations" element={<DeliveryDestinations />} />
      <Route path="/terms" element={<iframe src="/eula.html" style={{width: '100%', height: '100vh', border: 'none'}} title="Terms of Service" />} />
      <Route path="/privacy" element={<iframe src="/privacy.html" style={{width: '100%', height: '100vh', border: 'none'}} title="Privacy Policy" />} />
    </Routes>
    </div>
  );
}


export default App;
