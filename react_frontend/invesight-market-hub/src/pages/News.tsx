// src/pages/News.tsx
// This component acts as the page for /dashboard/news.
// NewsAnalyzer is rendered by NewsWrapper, which handles context passing.
import React from 'react';

const News = () => {
  return (
    // This component is now just a container for NewsAnalyzer,
    // which will be rendered by NewsWrapper.
    // Any specific page-level layout for the news page can go here.
    <div className="p-0">
      {/* NewsAnalyzer will be automatically rendered by NewsWrapper when /dashboard/news is active */}
    </div>
  );
};

export default News;