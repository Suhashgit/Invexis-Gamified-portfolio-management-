// src/StockProjectionWrapper.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import StockProjection from './components/StockProjection'; // Correct relative import

// Define the context type, must match what Index.tsx provides
interface OutletContextType {
  currentUserEmail: string | null;
  onLogout: () => void;
}

const StockProjectionWrapper = () => {
  // Destructure currentUserEmail and onLogout from useOutletContext
  const { currentUserEmail, onLogout } = useOutletContext<OutletContextType>();

  // Pass these retrieved values as props to StockProjection
  return <StockProjection currentUserEmail={currentUserEmail} onLogout={onLogout} />;
};

export default StockProjectionWrapper;