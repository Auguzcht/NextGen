import { useState, useEffect } from 'react';
import supabase from '../services/supabase.js';

/**
 * A hook to fetch data from Supabase.
 * @param {string} table - The table to query
 * @param {function} query - A function that takes a query builder and returns a modified query
 * @param {array} dependencies - Dependencies array to trigger refetch
 * @returns {object} - { data, error, loading, refetch }
 */
function useSupabaseQuery(table, queryModifier = (query) => query, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select();
      query = queryModifier(query);

      const { data: result, error: queryError } = await query;
      
      if (queryError) throw queryError;
      
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Error fetching data from ${table}:`, err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [...dependencies]);

  return { data, error, loading, refetch: fetchData };
}

export default useSupabaseQuery;