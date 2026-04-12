import { useState, useEffect } from 'react';

/**
 * Custom hook for fetching data from an API.
 * @param {string} url - The URL to fetch data from.
 * @returns {object} { status, data, errorMessage }
 */
export const useFetch = (url) => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!url) return;

    const fetchData = async () => {
      setStatus('loading');
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Request failed with status ${response.status}: ${response.statusText}`,
          );
        }
        const jsonData = await response.json();
        setData(jsonData);
        setStatus('success');
      } catch (error) {
        setErrorMessage(error.message);
        setStatus('error');
      }
    };

    fetchData();
  }, [url]);

  return { status, data, errorMessage };
};
