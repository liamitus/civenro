import React, { useEffect, useState } from 'react';
import { getBills } from '../services/billService';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchBills = async () => {
      const data = await getBills();
      setBills(data);
    };
    fetchBills();
  }, []);

  return (
    <div>
      {bills.map((bill: any) => (
        <div key={bill.id}>
          <Link to={`/bills/${bill.id}`}>{bill.title}</Link>
        </div>
      ))}
    </div>
  );
};

export default HomePage;
