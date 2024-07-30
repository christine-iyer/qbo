import { Route, Routes } from 'react-router-dom';
import QuickBooksAuth from './components/QuickBooksAuth';
import CreateInvoice from './components/CreateInvoice';
import FetchCustomers from './components/FetchCustomers';
import Nav from './components/Nav';
function App(){
  return (
    <div className="App">
      <Nav/>

    <Routes>
      <Route path="/" element={<QuickBooksAuth />} />
      <Route path="/create-invoice" element={<CreateInvoice />} />
      <Route path="/customers" element={<FetchCustomers />} />
    </Routes>
    </div>
  );
}


export default App;
