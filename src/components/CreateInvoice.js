import React, { useState } from 'react';
import axios from 'axios';

const CreateInvoice = () => {
  const [invoice, setInvoice] = useState({
    CustomerRef: { value: '' },
    BillEmail: { Address: '' },
    Line: [
      {
        Amount: 100.00,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: '1' },
        },
      },
    ],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      [name]: { value },
    }));
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setInvoice((prevInvoice) => ({
      ...prevInvoice,
      BillEmail: { Address: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/create-invoice', invoice);
      console.log('Invoice created successfully', response.data);
    } catch (error) {
      console.error('Error creating invoice', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Customer ID:
        <input
          type="text"
          name="CustomerRef"
          value={invoice.CustomerRef.value}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Customer Email:
        <input
          type="email"
          name="BillEmail"
          value={invoice.BillEmail.Address}
          onChange={handleEmailChange}
          required
        />
      </label>
      <button type="submit">Create Invoice</button>
    </form>
  );
};

export default CreateInvoice;
