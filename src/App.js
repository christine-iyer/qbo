import { Route, Routes } from 'react-router-dom';
import QuickBooksAuth from './components/QuickBooksAuth';
import CreateInvoice from './components/CreateInvoice';
import FetchCustomers from './components/FetchCustomers';
import ManageInvoices from './components/ManageInvoices';
import ItemsList from './components/ItemsList';
import DeliveryReport from './components/DeliveryReport';
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
      <Route path="/customers" element={<FetchCustomers />} />
      <Route path="/manage-invoices" element={<ManageInvoices />} />
      <Route path="/items" element={<ItemsList />} />
      <Route path="/delivery-report" element={<DeliveryReport />} />
    </Routes>
    </div>
  );
}


export default App;
