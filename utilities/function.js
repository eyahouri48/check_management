import pool from '../db_con.js';

// Function to get all banks
export const getBanks = async () => {
    const query = 'SELECT * FROM bank'; // Adjust the query according to your table structure
    const result = await pool.query(query);
    return result.rows;
};

// Function to get accounts by bank code
export const getAccountsByBank = async (bankCode) => {
    const query = 'SELECT * FROM account WHERE bankCode = $1';
    const result = await pool.query(query, [bankCode]);
    return result.rows;
};
