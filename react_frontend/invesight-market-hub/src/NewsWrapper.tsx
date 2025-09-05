// src/NewsWrapper.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import NewsAnalyzer from './components/NewsAnalyzer'; // Correct relative import to NewsAnalyzer

// Define the context type, must match what Index.tsx provides
interface OutletContextType {
  currentUserEmail: string | null;
  onLogout: () => void;
}

const NewsWrapper = () => {
  const { currentUserEmail, onLogout } = useOutletContext<OutletContextType>();

  return <NewsAnalyzer currentUserEmail={currentUserEmail} onLogout={onLogout} />;
};

export default NewsWrapper;